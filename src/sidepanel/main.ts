import { createApp } from 'vue';
import App from './App.vue';
import './style.css';
import { stampUiDocument } from '../chrome/ui-document';
void stampUiDocument().then((ready) => {
  if (ready) createApp(App).mount('#app');
});
