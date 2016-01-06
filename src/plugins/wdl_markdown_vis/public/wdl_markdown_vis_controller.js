define(function (require) {
  var marked = require('marked');
  marked.setOptions({
    gfm: true, // Github-flavored markdown
    sanitize: true // Sanitize HTML tags
  });

  var module = require('ui/modules').get('kibana/markdown_vis', ['kibana']);
  module.controller('KbnWdlMarkdownVisController', function ($scope, Private, $sce, $interpolate, $route, $http) {
    //TODO - why is $sce always visible in these functions, but I need to
    // have a scoped variable to hold onto interpolate?
    $scope.my_interpolate = $interpolate;
    $scope.my_route = $route;
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
      var query = undefined;
      if ($scope.my_route.current.locals.savedVis) {
        query = $scope.my_route.current.locals.savedVis.searchSource.filter()._state.query.query_string.query;
      } else {
        query = $scope.my_route.current.locals.dash.searchSource.query()._state.filter[0].query.query_string.query;
      }
      // $scope.my_route.current.locals.savedVis.searchSource.filter()._state.query.query_string.query ;
      // $scope.my_route.current.locals.dash.searchSource.query()._state.filter[0].query.query_string.query;

      if ($scope.lastQuery === query) {return;}
      $scope.lastQuery = query;

      // ----- get info from cromwell server
      var request = {
        method: 'get',
        url: '/api/workflows/v1/' + query + '/metadata'
      };
      // send the request and handle response
      $http(request).then(
        // OK
        function (response) {
          console.log('success', response);
          $scope.processMarkdown($scope.markdown, response);
        },
        // Error
        function (response) {
          console.log('error', response);
          $scope.processMarkdown($scope.markdown, response);
        }
      );
    };


    // response from elastic search - request out of scope
    $scope.$watch('esResponse', function (resp) {
      // if (resp) {
      //   $scope.processMarkdown($scope.markdown, resp);
      // }
      triggerProcessMarkDown();
    });

    // response markdown, trigger call to cromwell
    $scope.$watch('vis.params.markdown', function (markdown) {
      if (!markdown) {return;}
      $scope.markdown = markdown;
      triggerProcessMarkDown();
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
