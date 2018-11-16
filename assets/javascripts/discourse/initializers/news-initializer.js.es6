import { withPluginApi } from 'discourse/lib/plugin-api';
import { default as computed, on, observes } from 'ember-addons/ember-computed-decorators';
import { findRawTemplate } from "discourse/lib/raw-templates";
import { getOwner } from 'discourse-common/lib/get-owner';
import { wantsNewWindow } from "discourse/lib/intercept-click";

export default {
  name: 'news-edits',
  initialize(container){
    withPluginApi('0.8.12', (api) => {
      api.modifyClass('component:topic-list', {
        @computed('newsRoute')
        routeEnabled(newsRoute) {
          if (newsRoute) {
            return ['topic_list_social'];
          } else {
            return false;
          }
        },

        @computed('currentRoute')
        newsRoute(currentRoute) {
          return currentRoute === 'news';
        },

        @on('didInsertElement')
        @observes('newsRoute')
        setupNews() {
          const newsRoute = this.get('newsRoute');
          if (newsRoute) {
            const newsCategory = this.site.get("categoriesList").find(c => c.id == Discourse.SiteSettings.discourse_news_category);
            this.set('category', newsCategory);
            Ember.run.scheduleOnce('afterRender', () => {
              this.$().parents('#list-area').addClass('news');
            })
          } else {
            Ember.run.scheduleOnce('afterRender', () => {
              this.$().parents('#list-area').removeClass('news');
            })
          }
        }
      });

      api.modifyClass('component:topic-list-item', {
        buildBuffer(buffer) {
          const currentRoute = this.get('currentRoute');
          if (currentRoute === 'news') {
            const template = findRawTemplate("list/news-item");
            if (template) {
              buffer.push(template(this));
            }
          } else {
            return this._super(buffer);
          }
        }
      });

      api.modifyClass('component:share-popup', {
        @on('didInsertElement')
        getTopicId() {
          const newsShare = this.get('newsShare');
          if (newsShare) {
            const topicMap = this.get('topics').reduce((map, t) => {
              map[t.id] = t;
              return map;
            }, {});

            $("html").on(
            "click.discourse-share-link-topic",
            "button[data-share-url]", e => {
              if (wantsNewWindow(e)) {
                return true;
              }
              const $currentTarget = $(e.currentTarget);
              const topicId = $currentTarget.closest("tr").data("topic-id");
              this.set('topic', topicMap[topicId]);
            });
          }
        },

        @on('willDestroyElement')
        teardownGetTopicId() {
          $("html").off("click.discourse-share-link-topic");
        }
      });

      api.modifyClass('component:site-header', {
        router: Ember.inject.service('-routing'),
        currentRoute: Ember.computed.alias('router.router.currentRouteName'),

        @observes('currentRoute')
        rerenderWhenRouteChanges() {
          this.queueRerender();
        },

        buildArgs() {
          return $.extend(this._super(), {
            currentRoute: this.get('currentRoute')
          });
        }
      });

      api.reopenWidget('header-buttons', {
        html(attrs) {
          let buttons = this._super(attrs) || [];
          let className = 'header-nav-link';

          if (attrs.currentRoute === 'news') {
            className += ' active';
          }

          buttons.unshift(this.attach('link', {
            href: '/news',
            label: 'filters.news.title',
            className
          }));

          return buttons;
        }
      })
    });
  }
}
