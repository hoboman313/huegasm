import Ember from 'ember';

const {
  Controller,
  isEmpty,
  $
} = Ember;

export default Controller.extend({
  dimmerOn: false,
  lightsIconsOn: true,

  init() {
    this._super(...arguments);

    chrome.storage.local.get('dimmerOn', ({dimmerOn}) => {
      chrome.storage.local.get('lightsIconsOn', ({lightsIconsOn}) => {
        if (!isEmpty(dimmerOn) && dimmerOn) {
          this.send('toggleDimmer');
        }

        if (!isEmpty(lightsIconsOn)) {
          this.set('lightsIconsOn', lightsIconsOn);
        }
      })
    });
  },

  actions: {
    toggleLightsIcons() {
      this.toggleProperty('lightsIconsOn');

      let lightsIconsOn = this.get('lightsIconsOn');

      chrome.storage.local.set({ 'lightsIconsOn': lightsIconsOn });
    },
    toggleDimmer() {
      this.toggleProperty('dimmerOn');

      let dimmerOn = this.get('dimmerOn');

      if (dimmerOn) {
        $('body').addClass('dimmerOn');
        $('html').addClass('dimmerOn');
      } else {
        $('body').removeClass('dimmerOn');
        $('html').removeClass('dimmerOn');
      }

      chrome.storage.local.set({ 'dimmerOn': dimmerOn });
    }
  }
});