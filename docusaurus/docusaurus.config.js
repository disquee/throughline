// @ts-check
// Docusaurus config for the VenueOS Product Knowledge Base published site.
// Docs are served at the site root; the blog is disabled. This is the
// "curated / original" publishing layer of the PKB.

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'VenueOS Product Knowledge Base',
  tagline: 'The context layer for GTM teams',
  favicon: 'img/favicon.ico',

  url: 'https://pkb.example.com',
  baseUrl: '/',

  organizationName: 'venueos',
  projectName: 'venueos-pkb',

  onBrokenLinks: 'warn',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/', // serve docs at the site root
          sidebarPath: require.resolve('./sidebars.js'),
          // Point "Edit this page" at the raw source in your repo.
          editUrl: 'https://github.com/your-org/venueos-pkb/edit/main/docusaurus/',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'VenueOS PKB',
        items: [
          { type: 'docSidebar', sidebarId: 'pkbSidebar', position: 'left', label: 'Knowledge Base' },
          { href: 'https://github.com/your-org/venueos-pkb', label: 'GitHub', position: 'right' },
        ],
      },
      footer: {
        style: 'dark',
        copyright: 'VenueOS Product Knowledge Base — demo reference architecture.',
      },
      prism: {
        theme: require('prism-react-renderer').themes.github,
        darkTheme: require('prism-react-renderer').themes.dracula,
      },
    }),
};

module.exports = config;
