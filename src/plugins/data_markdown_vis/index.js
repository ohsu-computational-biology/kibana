module.exports = function (kibana) {

  return new kibana.Plugin({

    uiExports: {
      visTypes: [
        'plugins/data_markdown_vis/data_markdown_vis'
      ]
    }

  });

};
