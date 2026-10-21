import { createApp } from 'vue';
import PopupApp from './PopupApp.vue';
import '../sidepanel/style.css';
import { stampUiDocument } from '../chrome/ui-document';
stampUiDocument();
createApp(PopupApp).mount('#app');
