define(function (require) {

  var marked = require('marked');
  marked.setOptions({
    gfm: true, // Github-flavored markdown
    sanitize: true // Sanitize HTML tags
  });

  // get the kibana/data_markdown_vis module, and make sure that it requires the "kibana" module if it
  // didn't already
  var module = require('ui/modules').get('kibana/data_markdown_vis', ['kibana']);



  // * took={{took}}
  // * timed_out?={{timed_out}}
  // * hits={{hits}}
  //
  module.controller('KbnDataMarkdownVisController', function ($scope, Private, $sce, $interpolate,$route) {
    var tabifyAggResponse = Private(require('ui/agg_response/tabify/tabify'));
    var metrics = $scope.metrics = [];

    //TODO - why is $sce always visible in these functions, but I need to
    // have a scoped variable to hold into interpolate?
    $scope.my_interpolate = $interpolate;

    // iterpolate the markdown using the response as context
    //TODO loop through hits or aggregation reintpreting
    $scope.processMarkdown = function (markdown,resp) {
      if (!$scope.markdown) {return;}
      var exp = $scope.my_interpolate(marked(markdown));
      $scope.html = $sce.trustAsHtml(exp(resp));
    };

    $scope.$watch('esResponse',function (resp) {
      if (resp) {
        $scope.processMarkdown($scope.markdown, resp);
      }
    });

    $scope.$watch('vis.params.markdown', function (markdown) {
      if (!markdown) return;
      $scope.markdown = markdown;
    });



  });
});
