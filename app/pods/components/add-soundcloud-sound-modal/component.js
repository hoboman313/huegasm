import Em from 'ember';

export default Em.Component.extend({
  actions: {
    close () {
      this.sendAction();
    },
    add (){
      this.sendAction('action', this.get('url'));
    }
  },

  url: null,

  onIsShowingModalChange: function(){
    if(this.get('isShowingModal')){
      this.set('url', null);
      setTimeout(()=>{
        Em.$('md-input-container input').focus();
      }, 500);
    }

  }.observes('isShowingModal'),

  didInsertElement: function() {
    var self = this;

    Em.$(document).keypress(function(event) {
      if(!self.get('saveDisabled') && event.which === 13) {
        self.send('add');
      }
    });
  },

  saveDisabled: function(){
    return Em.isNone(this.get('url')) || Em.isEmpty(this.get('url').trim());
  }.property('url')
});