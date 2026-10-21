import { createApp } from 'vue';
import PopupApp from './PopupApp.vue';
import '../sidepanel/style.css';
import { stampUiDocument } from '../chrome/ui-document';
void stampUiDocument().then((ready) => {
  if (ready) createApp(PopupApp).mount('#app');
});
