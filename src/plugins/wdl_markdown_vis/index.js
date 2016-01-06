module.exports = function (kibana) {

  return new kibana.Plugin({

    uiExports: {
      visTypes: [
        'plugins/wdl_markdown_vis/wdl_markdown_vis'
      ]
    }

  });

};
