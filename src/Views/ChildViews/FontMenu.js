var FontMenu = Backbone.View.extend({

    initialize: function(options) {

        // The element is already created in the StyleView. Just needs to be set.
        this.parent = options.parent;
        this.setElement(options.element);

        this.isOpen = false; // Whether the menu is open.
        this.fontLimit = 15; // Number of fonts shown when initially opened. Also number of additionaly loaded fonts by each "Load more".
        this.list = [];      // All the family names in the list.
        this.rendered = [];  // Family names that are *rendered* in the DOM element. The rest can be shown by Load More.
        this.query = '';     // Font search query. Do not modify, use the `search` method to search.

        // Caching selectors
        this.$listWrapper = this.$('.font-list-wrapper');
        this.$list = this.$('.font-list');
        this.$search = this.$('.search');
        this.$loadMore = this.$('.load-more');
        this.$currentWrapper = this.$('.current-wrapper');

        _.bindAll(this, '_onload', 'close', 'maxHeight', '_searchDone');

        Fonts.onload(this._onload);
    },

    // Only executed once the Fonts module is ready.
    _onload: function() {
        this.listenTo(this.model, 'change:family', this.updateCurrent);
        this.updateList();
        this.attachDOMEvents();
    },

    attachDOMEvents: function() {

        var menu = this;

        this.$el.on('click', function(event) {
            if (!menu.isOpen) {
                menu.open();
                menu.$search.focus();
                event.stopPropagation();
            } 
            else if (tagName(event.target) === 'input') {
                event.stopPropagation();
            } else {
                var family = getFamily(event.target, menu.el);
                if (family !== undefined) { 
                    menu.model.set({ family: family });
                }
                if (tagName(event.target) === 'b') {
                    menu.model.set({ weight: event.target.dataset.weight });
                }
            }
        });

        this.$search.on('input', function(event) {
            menu.search(event.target.value);
        });

        this.$loadMore.on('click', function(event) {
            menu.updateList(true);
            event.stopPropagation();
        });

        this.$list.on({
            mouseover: function(event) {
                if (menu.isOpen && tagName(event.target) === 'b') {
                    menu.model.setTemp({ weight: event.target.dataset.weight });
                }
                var family = getFamily(event.target, menu.el);
                menu.model.setTemp({ family: family });
            },
            mouseout: function(event) {
                if (tagName(event.target) === 'b') {
                    menu.model.unsetTemp('weight');
                }
            },
            mouseleave: function(event) {
                menu.model.unsetTemp('family');
            }
        });
    },

    // Opens the menu.
    open: function() {

        this.isOpen = true;
        Picker.$list.addClass('font-menu-open');
        this.$el.addClass('open-this');
        this.maxHeight();
        this.updateList();

        $(document.body).on('click', this.close);
        $(window).on('resize', this.maxHeight);
    },

    // Closes the menu.
    close: function() {

        if (!this.isOpen) return;

        this.isOpen = false;
        Picker.$list.removeClass('font-menu-open');
        this.$el.removeClass('open-this');

        $(document.body).off('click', this.close);
        $(window).off('resize', this.maxHeight);
    },

    // Highlights the current font, if it exists in the rendered list.
    highlightCurrent: function() {
        var family = this.model.get('family');
        var nth = this.rendered.indexOf(family);
        var current = (nth > -1) ? this.$list[0].children[nth] : undefined;
        var prev = this.$highlighted && this.$highlighted[0];

        if (prev !== current) {
            prev && $(prev).removeClass('current');
            this.$highlighted = current && $(current).addClass('current');
        }
    },

    // Builds an element for the current font that serves as a placeholder to open the menu.
    updateCurrent: function() {
        var family = this.model.get('family');
        var element = this.build([family]);
        this.$currentWrapper.empty().append(element);
    },

    // Given an array of families, it builds their DOM elements and returns them in a fragment.
    build: function(families) {
        Fonts.load(families);
        var fragment = document.createDocumentFragment();
        _.forEach(families, function(family) {
            fragment.appendChild(elementFromHTML(WFP.Templates.Font(Fonts.list[family])));
        });
        return fragment;
    },

    // Renders the list of fonts, taking care of necessary destruction and reconstruction
    updateList: function(loadMore) {

        var toRender = [];

        // If the list is empty, populate it with the default family names.
        if (!this.query && this.list.length === 0) {
            this.list = _.clone(Fonts.families);
        }

        // If what is rendered does not match the beginning of the list, the rendered list is emptied.
        if (!startsWith(this.list, this.rendered)) {
            this.$list.empty();
            this.rendered = [];
        }

        // If the font limit is not reached, render more fonts!
        if (this.rendered.length < this.fontLimit) {
            toRender = _.difference(this.list.slice(0, this.fontLimit), this.rendered);
        }

        // If loadMore, then load more.
        if (loadMore) {
            toRender = _.difference(this.list, this.rendered).slice(0, this.fontLimit);
        }

        // If toRender is not empty, build the list elements and append them to the current list.
        if (toRender.length) {
            var fragment = this.build(toRender);
            this.$list.append(fragment);
            this.rendered = this.rendered.concat(toRender);
        }

        // If both lists are the same length, all the fonts must be loaded.
        if (this.rendered.length >= this.list.length) {
            this.$el.addClass('all-loaded');
        } else {
            this.$el.removeClass('all-loaded');
        }

        this.highlightCurrent();
    },

    // Searches all available fonts.
    search: function(query) {

        this.query = query;
        this.$listWrapper[0].scrollTop = 0;

        if (!query) {
            this.$el.removeClass('no-results');
            this.list = [];
            this.updateList();
            return;
        }

        Fonts.search(query).done(this._searchDone);
    },

    _searchDone: function(results) {
        if (results.length === 0) {
            this.$el.addClass('no-results');
        } else { 
            this.$el.removeClass('no-results');
            this.list = results;
            this.updateList();
        }
    },

    // Sets the CSS `max-height` property of the list. 
    maxHeight: function() {
        var w = window;
        var p = Picker.el;
        var calc = (w.innerHeight - 2 * p.offsetTop) - (p.offsetHeight - this.$listWrapper.outerHeight()) + 'px';
        this.$listWrapper.css('max-height', calc);
    }

});
