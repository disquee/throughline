// @ts-check
/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  pkbSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Features',
      items: ['features/smart-hold'],
    },
    {
      type: 'category',
      label: 'Releases',
      items: ['releases/2026-2'],
    },
    {
      type: 'category',
      label: 'API',
      items: ['api/holds'],
    },
  ],
};
module.exports = sidebars;
