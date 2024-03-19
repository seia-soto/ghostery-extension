import { html } from 'hybrids';

export default {
  content: () => html`
    <template layout="column grow relative">
      <gh-panel-container>
        <div layout="column items:center gap margin:1.5">
          <ui-text
            type="label-l"
            layout="block:center width:::210px margin:top"
          >
            Ghostery has nothing to do on this page
          </ui-text>
          <ui-text type="body-m" layout="block:center width:::245px">
            Check if Ghostery and developer mode were enabled in the settings.
          </ui-text>
        </div>
      </gh-panel-container>
    </template>
  `,
};
