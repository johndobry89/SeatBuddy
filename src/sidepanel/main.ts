import { createApp } from 'vue';
import App from './App.vue';
import './style.css';
import { stampUiDocument } from '../chrome/ui-document';
stampUiDocument();
createApp(App).mount('#app');
