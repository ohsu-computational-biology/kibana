define(function (require) {
  // we need to load the css ourselves
  require('plugins/data_markdown_vis/data_markdown_vis.less');

  // we also need to load the controller and used by the template
  require('plugins/data_markdown_vis/data_markdown_vis_controller');

  // register the provider with the visTypes registry
  require('ui/registry/vis_types').register(DataMarkdownVisProvider);

  function DataMarkdownVisProvider(Private) {
    var TemplateVisType = Private(require('ui/template_vis_type/TemplateVisType'));
    var Schemas = Private(require('ui/Vis/Schemas'));

    // return the visType object, which kibana will use to display and configure new
    // Vis object of this type.
    return new TemplateVisType({
      name: 'data_markdown',
      title: 'Data Markdown',
      description: 'A markdown widget that knows about data',
      icon: 'fa-pencil-square-o',
      template: require('plugins/data_markdown_vis/data_markdown_vis.html'),
      params: {
        defaults: {
          perPage: 10,
          showPartialRows: false,
          showMeticsAtAllLevels: false
        },
        editor: require('plugins/data_markdown_vis/data_markdown_vis_params.html')
      },
      hierarchicalData: function (vis) {
        return Boolean(vis.params.showPartialRows || vis.params.showMeticsAtAllLevels);
      },
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Metric',
          min: 1,
          defaults: [
            { type: 'count', schema: 'metric' }
          ]
        },
        {
          group: 'buckets',
          name: 'bucket',
          title: 'Split Rows'
        },
        {
          group: 'buckets',
          name: 'split',
          title: 'Split Table'
        }
      ])

      // requiresSearch: true,
      // schemas: new Schemas([
      //   {
      //     // group: 'metrics',
      //     // name: 'metric',
      //     // title: 'Metric',
      //     // min: 1,
      //     // defaults: [
      //     //   { type: 'count', schema: 'metric' }
      //     // ]
      //     min: 0,
      //     max: Infinity,
      //     group: 'metrics',
      //     name: "metrics",
      //     title: "Metric",
      //     aggFilter: '*',
      //     editor: false,
      //     params: []
      //   }
      // ])
    });
  }

  // export the provider so that the visType can be required with Private()
  return DataMarkdownVisProvider;
});
