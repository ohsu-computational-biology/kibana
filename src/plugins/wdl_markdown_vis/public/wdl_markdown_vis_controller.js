define(function (require) {
  var marked = require('marked');
  marked.setOptions({
    gfm: true, // Github-flavored markdown
    sanitize: true // Sanitize HTML tags
  });

  var module = require('ui/modules').get('kibana/markdown_vis', ['kibana']);
  module.controller('KbnWdlMarkdownVisController', function ($scope, Private, $sce, $interpolate, $route, $http, config) {


    //TODO - why is $sce always visible in these functions, but I need to
    // have a scoped variable to hold onto interpolate?
    $scope.my_interpolate = $interpolate;
    $scope.my_route = $route;

    $scope.cccWorkflow = {};
    // see wdl_examples/kibana_add to see how wdl's are added
    var workflows = config._vals().cccWdlWorkflows;
    $scope.cccWorkflow.names = [];
    for (var prop in workflows) {
      if (workflows.hasOwnProperty(prop)) {
        $scope.cccWorkflow.names.push(prop);
      }
    }
    $scope.$watch('cccWorkflow.name', function (name) {
      if (!name) { return; }
      var workflows = config._vals().cccWdlWorkflows;
      var workflow = undefined;
      for (var prop in workflows) {
        if (prop === name) {
          workflow = workflows[prop];
        }
      }
      if (!workflow) {
        $scope.cccStatusText = 'Workflow ' + $scope.cccWorkflow.name + ' not found.';
        return;
      }
      $scope.sourceInputs.wdlSource = window.atob(workflow.wdl_base64_script_body);
      $scope.sourceInputs.metaParamName = workflow.meta_param_name;
    });


    $scope.processMarkdown = function (markdown, resp) {
      if (!$scope.markdown) {
        return;
      }
      if (!resp) {
        return;
      }

      //TODO ... we need to set these options here.
      marked.setOptions({
        gfm: true, // Github-flavored markdown
        sanitize: false // !Sanitize HTML tags let inline html come through
      });
      var exp = $scope.my_interpolate(marked(markdown));
      $scope.wdl_html = $sce.trustAsHtml(exp(resp));
    };

    // utility to call cromwell and call processMarkdown
    $scope.lastQuery = undefined;
    var triggerProcessMarkDown = function () {
      // get filter passed in : we only support lookup by id
      var query = $scope.outputs.wdlIdentifier;
      // $scope.my_route.current.locals.savedVis.searchSource.filter()._state.query.query_string.query ;
      // $scope.my_route.current.locals.dash.searchSource.query()._state.filter[0].query.query_string.query;

      //if ($scope.lastQuery === query) {return;}
      //$scope.lastQuery = query;

      // ----- get info from cromwell server
      var request = {
        method: 'get',
        url: '/api/workflows/v1/' + query + '/status'
      };
      // send the request and handle response
      $http(request).then(
        // OK
        function (response) {
          console.log('success', response);
          $scope.results.messages = ['success'];
          $scope.processMarkdown($scope.markdown, response);
        },
        // Error
        function (response) {
          console.log('error', response);
          $scope.results.messages = ['error'];
          $scope.processMarkdown($scope.markdown, response);
        }
      );
    };


    // cccHits set in rootScope by our modification to doc_table
    $scope.columns = [];
    $scope.columnSelections = {};
    $scope.columnSelections.selectedColumns = [{'name':'ccc_did'}];
    $scope.$watch('cccHits', function (cccHits) {
      if (!cccHits) { return; }
      if (!$scope.cccHits[0] && $scope.cccHits[0]._source) { return; }
      // only refresh first time
      if ($scope.columns.length === 0)  {
        var obj = $scope.cccHits[0]._source;
        for (var x in obj) {
          if (obj.hasOwnProperty(x)) {
            $scope.columns.push({'name':x});
          }
        }
        $scope.columns.sort();
        $scope.columns.unshift({'name':'**(ccc_did only)'});
      }
      $scope.refreshNeeded = $scope.sourceInputs && $scope.sourceInputs.workflowInputs &&  $scope.sourceInputs.workflowInputs.length > 0;
    });

    $scope.sourceInputs = {'wdlSource':undefined};
    $scope.validation = {'messages':[]};
    $scope.validate = function (wdlSource) {
      $scope.validation.messages = [];
      $scope.validation.messages.push('Under construction. (No REST endpoint for validation)');
    };

    $scope.results = {};
    $scope.checkResults = function () {
      $scope.results.messages = [];
      $scope.results.messages.push('Checking...');
      triggerProcessMarkDown();
    };

    $scope.submit = function (wdlSource) {
      $scope.submission = {};
      $scope.submission.messages = [];
      $scope.outputs = {};
      $scope.submission.messages.push('Submitted ...');
      // serialize the inputs as form data
      var formData = new FormData();
      formData.append(
        'wdlSource',
        new Blob([wdlSource],
                 {type: 'application/octet-stream','Content-Disposition': 'form-data; name="wdlSource"; filename="hello.wdl"'}),
        'wdlSource'
        );
      formData.append(
        'workflowInputs',
        new Blob([$scope.sourceInputs.workflowInputs],
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
          $scope.submission.messages = [];
          $scope.submission.messages.push('success: ' + JSON.stringify(response));
          $scope.outputs.wdlIdentifier = response.data.id;
          setTimeout(function () {$scope.checkResults();}, 2000);
        },
        // Error
        function (response) {
          console.log('error',response);
          $scope.submission.messages = [];
          $scope.submission.messages.push('error: ' + JSON.stringify(response));
        }
      );

    };

    $scope.refreshParameters = function () {
      //trigger a change to columnSelections watch
      $scope.columnSelections.refreshNeeded = true;
    };

    $scope.$watch('columnSelections', function (columnSelections) {
      if (!columnSelections.selectedColumns) { return; }
      if (!$scope.cccHits) { return; }
      if (!($scope.cccHits[0] && $scope.cccHits[0]._source)) { return; }
      var names = columnSelections.selectedColumns.map(function (e) {return e.name;});
      var workflowInputs = $scope.cccHits.map(function (e) {
        var p = {};
        p.ccc_did = e._source.ccc_did;
        //if no additional columns selected, return a simple string
        //otherwise return object
        if (names.indexOf('**(ccc_did only)') === -1) {
          columnSelections.selectedColumns.forEach(function (c) {
            p[c.name] = e._source[c.name];
          });
        }  else {
          p = e._source.ccc_did;
        }
        return p;
      });
      var obj = {};
      if ($scope.sourceInputs && $scope.sourceInputs.workflowInputs && $scope.sourceInputs.workflowInputs.length  > 0) {
        obj = JSON.parse($scope.sourceInputs.workflowInputs);
      }
      obj[$scope.sourceInputs.metaParamName] = workflowInputs;
      $scope.sourceInputs.workflowInputs = JSON.stringify(obj);
      $scope.refreshNeeded =  $scope.columnSelections.refreshNeeded = false;
    },true);


    // response markdown, update scope
    $scope.$watch('vis.params.markdown', function (markdown) {
      if (!markdown) {return;}
      $scope.markdown = markdown;
    });


  });
});


// define(function(require) {
//
//   var marked = require('marked');
//
//
//   // get the kibana/wdl_markdown_vis module, and make sure that it requires the "kibana" module if it
//   // didn't already
//   var module = require('ui/modules').get('kibana/wdl_markdown_vis', ['kibana']);
//
//
//
//   // * took={{took}}
//   // * timed_out?={{timed_out}}
//   // * hits={{hits}}
//   //
//   module.controller('KbnWdlMarkdownVisController', function($scope, Private, $sce, $interpolate, $route, $http) {
//     var tabifyAggResponse = Private(require('ui/agg_response/tabify/tabify'));
//     var metrics = $scope.metrics = [];
//
//     //TODO - why is $sce always visible in these functions, but I need to
//     // have a scoped variable to hold onto interpolate?
//     $scope.my_interpolate = $interpolate;
//     $scope.my_route = $route;
//
//     // iterpolate the markdown using the response as context
//     //TODO loop through hits or aggregation reintpreting
//     $scope.processed = false;
//
//     $scope.processMarkdown = function(markdown, resp) {
//       if (!$scope.markdown) {
//         return;
//       }
//       if (!resp) {
//         return;
//       }
//
//       //TODO ... we need to set these options here.
//       marked.setOptions({
//         gfm: true, // Github-flavored markdown
//         sanitize: false // !Sanitize HTML tags let inline html come through
//       });
//       var exp = $scope.my_interpolate(marked(markdown));
//       $scope.wdl_html = $sce.trustAsHtml(exp(resp));
//     };
//
//
//     // response from elastic search - request out of scope
//     $scope.processedMarkDown = false;
//     $scope.$watch('esResponse', function(resp) {
//       // if (resp) {
//       //   $scope.processMarkdown($scope.markdown, resp);
//       // }
//       triggerProcessMarkDown();
//     });
//
//
//     // response markdown, trigger call to cromwell
//     $scope.$watch('vis.params.markdown', function(markdown) {
//       if (!markdown) {return;}
//       $scope.markdown = markdown;
//       triggerProcessMarkDown();
//     });
//
//     var triggerProcessMarkDown = function() {
//       $scope.esResp = {hits:{total:1}};
//       if($scope.processedMarkDown) {return;}
//       $scope.processedMarkDown = true;
//       // get filter passed in : we only support lookup by id
//       if($scope.my_route.current.locals.savedVis){
//         var query = $scope.my_route.current.locals.savedVis.searchSource.filter()._state.query.query_string.query;
//       } else {
//         var query = $scope.my_route.current.locals.dash.searchSource.query()._state.filter[0].query.query_string.query;
//       }
//       // $scope.my_route.current.locals.savedVis.searchSource.filter()._state.query.query_string.query ;
//       // $scope.my_route.current.locals.dash.searchSource.query()._state.filter[0].query.query_string.query;
//
//       // ----- get info from cromwell server
//       var request = {
//         method: 'get',
//         url: '/api/workflows/v1/' + query + '/metadata'
//       };
//       // send the request and handle response
//       $http(request).then(
//         // OK
//         function(response) {
//           console.log('success', response);
//           $scope.processMarkdown($scope.markdown, response);
//         },
//         // Error
//         function(response) {
//           console.log('error', response);
//           $scope.processMarkdown($scope.markdown, response);
//         }
//       );
//     }
//
//
//
//   });
// });
