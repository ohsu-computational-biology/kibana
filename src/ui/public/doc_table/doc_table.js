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
  .directive('docTable', function (config, Notifier, getAppState, $http) {
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

        // should this table show a CCC submission element?
        $scope.showSubmitToCCC = function () {
          var show = false;
          if ($scope.hits && $scope.hits[0] && $scope.hits[0]._type === 'aggregated-resource') {
            show = true;
          }
          return show;
        };
        // send the resources to a CCC workflow
        $scope.my_http = $http; //TODO why is $http not visible unless I save it
        $scope.cccWorkflow = {};
        $scope.cccWorkflow.names = ['wdl1','wdl2','wdl3']; //TODO - get from config
        $scope.cccWorkflow.name = undefined;
        if (!$scope.hits || $scope.hits.length === 0) {
          $scope.cccStatusText = '';
        } else {
          $scope.cccStatusText = 'Please select a workflow';
        }
        $scope.submitToCCC = function () {
          if ($scope.cccWorkflow.name  === undefined) {
            $scope.cccStatusText = 'Please select a workflow';
            return;
          }
          // grab the ccc_dids
          var cccDIDs = $scope.hits.map(function (e) {return e._source.ccc_did;});
          $http.post('http://localhost:3000/api/workflows/v1',{data:cccDIDs})
            .then(function (response) {
              $scope.cccStatusText = response.statusText + ' ' + response.data.status + ' ' + response.data.id;
              console.log(response);
            }, function (response) {
              $scope.cccStatusText = response.statusText + ' (error)';
              console.log(response);
            });
        };

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

            return $scope.searchSource.onResults().then(onResults);
          }).catch(notify.fatal);

          $scope.searchSource.onError(notify.error).catch(notify.fatal);
        }));

      }
    };
  });
});
