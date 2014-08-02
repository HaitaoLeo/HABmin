HABmin.ChartController = Ember.Controller.extend({
    filterText: "",
    filterPlaceholder: Ember.I18n.t("globalFilterPlaceholder"),
    selectedItems:["1"],

    init: function (params) {
        this._super();
    },
    actions: {
        resetFilter: function () {
            this.set("filterText", "");
        },
        changeStore: function (model, select) {
            this.set("selectedStore", select);
        },
        clickItem: function (item) {
            console.log("Item clicked:",item, "this is", this);
            console.log("List is ", this.get("selectedItems"));

            var list = this.get("selectedItems");
            if(list.contains(item))
                list.popObject(item);
            else
                list.pushObject(item);
        },
        showChart: function () {
        },
        clearSelection: function () {
            this.set("selectedItems", []);
        }
    },
    filterObserver: function() {
        console.log("onChange update", this.filterText);
    }.observes('filterText'),
    iconImg: Ember.computed('icon', function () {
        return this.get('icon') + ' ' + this.get('icon');
    }),
    isSelected: function(item) {
        item = "1";
        var sel = false;
        var list = this.get("selectedItems");
        if(list.contains(item))
            sel = true;

        console.log("Checking select for", item, "is", sel);
        console.log("List is ", this.get("selectedItems"));

        return sel;
    }.property("selectedItems.@each"),
    itemsTotal: function() {
        console.log("Checking itemsTotal");
        var list = this.get('model.items');
        return list.length;
    }.property('model.items.[]'),
    itemsSelected: function() {
        console.log("Checking itemsSelected");
        var list = this.get('selectedItems');
        return list.length;
    }.property('selectedItems.[]')
});

HABmin.ChartxxxController = Ember.Controller.extend({
    selectedStore: "mysql",
    init: function (params) {
        var me = this;

        this.items = HABmin.ChartItemsModel.model;
        this.services = [];

        this.regions = [];

        this.data = //{columns: []};

        {
            xs: {
                'data1': 'x1',
                'data2': 'x2'
            },
            columns: [
                ['x1', 1000, 3000, 4500, 5000, 7000, 10000],
                ['x2', 30, 50, 75, 100, 1000],
                ['data1', 30, 200, 100, 400, 150, 250],
                ['data2', 20, 180, 240, 100, 190]
            ],
            type: 'spline'
        };

        this.axis = {
            x: {
                type: 'timeseries',
                tick: {
                    format: '%H:%S'
                }
            }
        };
        /*
         Ember.$.getJSON('http://localhost:8080/services/habmin/persistence/items').then(
         function (response) {
         me.set("items", response.items);
         me.resetItemSelect();
         }
         );

         Ember.$.getJSON('http://localhost:8080/services/habmin/persistence/services').then(
         function (response) {
         me.set("services", response.services);
         }
         );*/
    },

    resetItemSelect: function () {
        if (this.items == null)
            return;

        for (var i = 0; i < this.items.length; i++) {
//            if(i % 2)
            //              this.items[i].selected = true;
            //        else
            this.items[i].selected = false;
        }
    },

    actions: {
        changeStore: function (model, select) {
            this.set("selectedStore", select);
        },

        clickItem: function (item) {
            var items = this.get("items");
            /*            items[0].selected = true;
             this.set("items", items);
             return;
             */
            for (var i = 0; i < items.length; i++) {
                if (items[i].name == item.name) {
//                    this.set("items[0].selected", true);
                    items[i].selected = !items[i].selected;
                    break;
                }
            }
            this.set("items", items);
        },

        showChart: function () {
            var items = this.get("items");

            this.data.columns = [];
            this.itemsTotal = 0;
            this.itemsLoaded = 0;
            this.chartStop = Math.round((new Date()).getTime());
            this.chartStart = this.chartStop - (this.chartPeriod * 1000);
            this._calculateXTicks();
            for (var i = 0; i < items.length; i++) {
                if (items[i].selected == true) {
                    this.itemsTotal++;
                    this._loadItem(items[i].name, this.chartStart, this.chartStop);
                }
            }
        }
    },

    _loadItem: function (itemRef, start, stop) {
        console.log("Requesting ", itemRef);
        var parms = {};
        parms.starttime = start;
        parms.endtime = stop;

        this.chartDef = {};
        this.chartDef.items = [];
//        array.forEach(items, lang.hitch(this, function (item) {
        var newItem = {};
        newItem.item = itemRef;
        newItem.label = itemRef;
        this.chartDef.items.push(newItem);
//        }));

        var me = this;

        Ember.$.ajax({
                type: 'GET',
                //           headers: {
                //               "Content-Type": 'application/json; charset=utf-8',
                //               "Accept": "application/json"
                //           },
                data: parms,
                dataType: 'json',
                url: 'http://localhost:8080/services/habmin/persistence/services/rrd4j/' + itemRef
                //xhrFields: {
                //  withCredentials: true
                //}
            }
        ).then(
            function (response) {
                console.log("The item definition is: ", response);
                me._addChartItem(response);
            }

//            }),
//            lang.hitch(this, function (error) {
//                console.log("An error occurred: " + error);
//            })
        );
    },

    _addChartItem: function (item) {
        // Find the chart config for this item
        var itemCfg = null;
        for (var i = 0; i < this.chartDef.items.length; i++) {
            if (item.item == this.chartDef.items[i].name) {
                itemCfg = this.chartDef.items[i];
            }
        }
        ;

        if (itemCfg == null) {
            console.error("Unable to find definition for ", item, this.chartDef);
            return;
        }

        // If there's no repeat time, then set it to 'infinity'
        // Otherwise turn into milliseconds
        if (itemCfg.repeatTime == null || itemCfg.repeatTime < 1)
            itemCfg.repeatTime = 9007199254740000;
        else
            itemCfg.repeatTime *= 1000;

        console.log("Adding", item.name, "- repeat is ", itemCfg.repeatTime);

        var data = new Array();

        var x = ['x1'];
        var y = ['y1'];

        for (var i = 0; i < item.data.length; i++) {
            if (i != 0) {
                // Check if we want to extend the data
                if (item.data[i].time - item.data[i - 1].time > itemCfg.repeatTime) {
                    y.push(Number(item.data[i].data[i - 1].state));
                    x.push(Number(item.data[i].time - itemCfg.repeatTime));
                }
            }

            y.push(Number(item.data[i].state));
            x.push(Number(item.data[i].time));
        }
        ;

        this.data.columns.push(x);
        this.data.columns.push(y);

        this.data.xs = {
            'y1': 'x1'
        };
        this.data.type = 'spline';

        this.set("data", this.data);
        console.log("Updating data:", this.data);

        /*        if (itemCfg.lineStyle != undefined && itemCfg.lineStyle.length > 0)
         plotOptions.stroke.style = itemCfg.lineStyle;
         if (itemCfg.lineWidth != undefined && itemCfg.lineWidth.length > 0)
         plotOptions.stroke.width = itemCfg.lineWidth;
         if (itemCfg.lineColor != undefined && itemCfg.lineColor.length > 0)
         plotOptions.stroke.color = itemCfg.lineColor;
         console.log("Adding item " + item.name + ":", plotOptions);
         if (itemCfg.label == null)
         this.chart.addSeries(item.name, data, plotOptions);
         else
         this.chart.addSeries(itemCfg.label, data, plotOptions);
         */


        // If everything is loaded, create the legend and render
        this.itemsLoaded++;
        console.log("Loaded " + this.itemsLoaded + " of " + this.itemsTotal);
        if (this.itemsLoaded >= this.itemsTotal) {
            console.log("Rendering chart");
            /*            if (this.chartLegend == true) {
             this.legend = new Legend({chartRef: this.chart});
             var pane = new ContentPane({region: "bottom", content: this.legend})
             domClass.add(pane.domNode, "habminChartLegend");

             this.addChild(pane);
             this.legend.refresh();

             // Hide the checkbox from the legend display
             array.forEach(this.legend.legends, lang.hitch(this, function (legend, i) {
             domStyle.set(legend.childNodes[0], "display", "none");

             //	toggle action
             hub.connect(legend.childNodes[2], "onclick", this, function (e) {
             domClass.toggle(legend.childNodes[2], "habminLegendDisabled");
             e.stopPropagation();
             });
             }));
             }*/

//            if (this.chartDef.title)
//                this.chart.title = this.chartDef.title;

//            this.chart.fullRender();
        }
    },
    _timeTicks: [
        {tick: 5000, bound: 60000, formatTick: "mm:ss", formatBound: "dd EEE HH:mm"},
        {tick: 10000, bound: 60000, formatTick: "mm:ss", formatBound: "dd EEE HH:mm"},
        {tick: 10800000, bound: 86400000, formatTick: "HH:mm", formatBound: "dd EEE HH:mm"},
        {tick: 21600000, bound: 86400000, formatTick: "HH:mm", formatBound: "EEE dd MMM HH:mm"},
        {tick: 43200000, bound: 86400000, formatTick: "HH:mm", formatBound: "EEE dd MMM HH:mm"},
        {tick: 86400000, bound: 604800000, formatTick: "EEE dd", formatBound: "EEE dd MMM"},
        {tick: 100800000, bound: 86400000, formatTick: "HH:mm", formatBound: "dd EEE HH:mm"}
    ],
    _calculateXTicks: function () {
        // Derive x labels
        var span = this.chartStop - this.chartStart;

        // X - holds the time between ticks
        var x = span / 7;

        console.log("Chart start: ", this.chartStart);
        console.log("Chart stop: ", this.chartStop);
        console.log("Chart span: ", span);
        console.log("Chart step: ", x);

        // Now find the step from the tick table
        var step;
        for (var i = this._timeTicks.length - 1; i >= 0; i--) {
            if (x > this._timeTicks[i].tick) {
                step = this._timeTicks[i];
                console.log("Selected tick config ", step);
                break;
            }
        }
        ;

        // TODO : Handle local time

        // Get the first tick
        var start = Math.ceil((this.chartStart + 1) / step.tick) * step.tick;

        var labels = [];
        while (start < this.chartStop) {
            labels.push(new Date(start));
//            if (start % step.bound == 0)
//                data.text = dt;
            start += step.tick;
        }

        this.axis.x.tick.values = labels;
        console.log("Chart axis config:", this.axis);

        return labels;
    }
});