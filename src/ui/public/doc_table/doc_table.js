define(function (require) {
  var _ = require('lodash');

  var html = require('ui/doc_table/doc_table.html');
  var getSort = require('ui/doc_table/lib/get_sort');

  require('ui/doc_table/doc_table.less');
  require('ui/directives/truncated');
  require('ui/directives/infinite_scroll');
  require('ui/doc_table/components/table_header');
  require('ui/doc_table/components/table_row');

  require('ui/modules').get('kibana')
  .directive('docTable', function (config, Notifier, getAppState, $http,$rootScope) {
    return {
      restrict: 'E',
      template: html,
      scope: {
        sorting: '=',
        columns: '=',
        hits: '=?', // You really want either hits & indexPattern, OR searchSource
        indexPattern: '=?',
        searchSource: '=?',
        infiniteScroll: '=?',
        filter: '=?',
      },
      link: function ($scope) {
        var notify = new Notifier();
        $scope.limit = 50;
        $scope.persist = {
          sorting: $scope.sorting,
          columns: $scope.columns
        };

        var prereq = (function () {
          var fns = [];

          return function register(fn) {
            fns.push(fn);

            return function () {
              fn.apply(this, arguments);

              if (fns.length) {
                _.pull(fns, fn);
                if (!fns.length) {
                  $scope.$root.$broadcast('ready:vis');
                }
              }
            };
          };
        }());

        // ------------------------
        // ------------------------ START CCC
        // ------------------------

        // should this table show a CCC submission element?
        // used by ./doc_table.html
        $scope.showSubmitToCCC = function () {
          var show = false;
          if ($scope.hits && $scope.hits[0] && $scope.hits[0]._type === 'aggregated-resource') {
            show = true;
          }
          return show;
        };

        // send the resources to a CCC workflow
        // used by ./doc_table.html
        // ... initialization
        $scope.my_http = $http; //TODO why is $http not visible unless I save it
        $scope.cccWorkflow = {};
        // see wdl_examples/kibana_add to see how wdl's are added
        var workflows = config._vals().cccWdlWorkflows;
        $scope.cccWorkflow.names = [];
        for (var prop in workflows) {
          if (workflows.hasOwnProperty(prop)) {
            $scope.cccWorkflow.names.push(prop);
          }
        }
        $scope.cccWorkflow.name = undefined;
        if (!$scope.hits || $scope.hits.length === 0) {
          $scope.cccStatusText = '';
        } else {
          $scope.cccStatusText = 'Please select a workflow';
        }



        // ... click handler

        $scope.submitToCCC = function () {
          if ($scope.cccWorkflow.name  === undefined) {
            $scope.cccStatusText = 'Please select a workflow';
            return;
          }

          var workflows = config._vals().cccWdlWorkflows;
          var workflow = undefined;
          for (var prop in workflows) {
            if (prop === $scope.cccWorkflow.name) {
              workflow = workflows[prop];
            }
          }
          if (!workflow) {
            $scope.cccStatusText = 'Workflow ' + $scope.cccWorkflow.name + ' not found.';
            return;
          }
          window.atob(workflow.wdl_base64_script_body);

          // grab the ccc_dids + any other `visible` data

          //TODO - the js side of this is trivial, however: we don't know how to
          // create an Array[Object] in wdl

          // var workflowInputs = $scope.hits.map(function (e) {
          //   var p = {};
          //   p['ccc_did'] = e._source.ccc_did;
          //   $scope.columns.forEach(function(c){
          //     p[c] = e._source[c];
          //   });
          //   return p;
          // });

          //TODO - so, for now just create a set of Array[String] with ccc_did
          var cccDIDs = $scope.hits.map(function (e) {
            return e._source.ccc_did;
          });
          var workflowInputs = {};
          workflowInputs[workflow.meta_param_name] = cccDIDs;


          var metaWDL = window.atob(workflow.wdl_base64_script_body);


          // serialize the inputs as form data
          var formData = new FormData();
          formData.append(
            'wdlSource',
            new Blob([metaWDL],
                     {type: 'application/octet-stream','Content-Disposition': 'form-data; name="wdlSource"; filename="hello.wdl"'}),
            'wdlSource'
            );
          formData.append(
            'workflowInputs',
            new Blob([JSON.stringify(workflowInputs)],
                     {type: 'application/octet-stream','Content-Disposition': 'form-data; name="workflowInputs"; filename="hello.json"'}),
            'workflowInputs'
            );

          // note: important that Content-Type is undefined, so that $http completes multipart formdata correctly :-(
          // see: http://uncorkedstudios.com/blog/multipartformdata-file-upload-with-angularjs
          var request = {
            method: 'POST',
            url: '/api/workflows/v1',
            headers: {'Content-Type': undefined},
            data: formData,
            transformRequest: function (data) { return data; }
          };

          // send the request and handle response
          $http(request).then(
            // OK
            function (response) {
              console.log('success',response);
              $scope.cccStatusText = response.statusText + ' ' + response.data.status;
              $scope.cccWdlJobId = response.data.id;
              // TODO - keep a record for our dashboard ? if so, do it here ...
              // var request = {
              //   method: 'POST',
              //   url: '/ccc/workflows/'+response.data.id,
              //   data: {id:workflow.id, workflowInputs:workflowInputs}
              // };
              // $http(request).then(function (response) {console.log('OK',response)},function (response) {console.log('ERROR',response)});
            },
            // Error
            function (response) {
              console.log('error',response);
              $scope.cccStatusText = response.statusText + ' ' + response.data.status + ' ' + response.data.id;
            }
          );


        };


        // ------------------------
        // ------------------------ END CCC
        // ------------------------

        $scope.addRows = function () {
          $scope.limit += 50;
        };

        // This exists to fix the problem of an empty initial column list not playing nice with watchCollection.
        $scope.$watch('columns', function (columns) {
          if (columns.length !== 0) return;

          var $state = getAppState();
          $scope.columns.push('_source');
          if ($state) $state.replace();
        });

        $scope.$watchCollection('columns', function (columns, oldColumns) {
          if (oldColumns.length === 1 && oldColumns[0] === '_source' && $scope.columns.length > 1) {
            _.pull($scope.columns, '_source');
          }

          if ($scope.columns.length === 0) $scope.columns.push('_source');
        });


        $scope.$watch('searchSource', prereq(function (searchSource) {
          if (!$scope.searchSource) return;

          $scope.indexPattern = $scope.searchSource.get('index');

          $scope.searchSource.size(config.get('discover:sampleSize'));
          $scope.searchSource.sort(getSort($scope.sorting, $scope.indexPattern));

          // Set the watcher after initialization
          $scope.$watchCollection('sorting', function (newSort, oldSort) {
            // Don't react if sort values didn't really change
            if (newSort === oldSort) return;
            $scope.searchSource.sort(getSort(newSort, $scope.indexPattern));
            $scope.searchSource.fetchQueued();
          });

          $scope.$on('$destroy', function () {
            if ($scope.searchSource) $scope.searchSource.destroy();
          });

          // TODO: we need to have some way to clean up result requests
          $scope.searchSource.onResults().then(function onResults(resp) {
            // Reset infinite scroll limit
            $scope.limit = 50;

            // Abort if something changed
            if ($scope.searchSource !== $scope.searchSource) return;

            $scope.hits = resp.hits.hits;
            $rootScope.cccHits = $scope.hits;

            return $scope.searchSource.onResults().then(onResults);
          }).catch(notify.fatal);

          $scope.searchSource.onError(notify.error).catch(notify.fatal);
        }));

      }
    };
  });
});
