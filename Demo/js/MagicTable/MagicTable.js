//Magic Table
//Created by Shane King
//August 18th, 2013

//Requirements:
//jQuery && jQuery UI (d'uh)
//jsRender

(function ($, undefined) {
    $.widget('mb.magictable', {
        options: {
            hasFilters: true,
            isSortable: true,
            data: null
        },

        _create: function () {
            var self = this,
                o = self.options;
            self.$el = this.element;
            self.oldSelf = self.$el.html();

            self.$el[0].id = self.$el[0].id || "magictable_" + Math.ceil(Math.random() * 9999999);
            self._options = {
                id: self.$el[0].id,
                rowsTemplate: null, //Cache rows template here so only need to AJAX for it once.
                //Sorted data
                sortedCol: null,
                sortedBy: null,
                //Filter timeout
                updateFilterTimeout: 0,
                //Filter debounce
                updateFilterTimeoutDebounce: []
            };

            if (o.hasFilters) {
                self._generateFilters();
            }
            self.$el.addClass("magictable");
            self._setUpBindings();
            if (o.data === null) {
                self._scrapeData();
            }
            self._insertDataIntoTable();
        },

        _init: function () {
            var self = this,
                o = self.options,
                _o = self._options,
                $el = self.$el;

            if(!$el.hasClass("magictable")){
                self._create();
            }
        },

        _scrapeData: function () {
            var self = this,
                o = self.options,
                _o = self._options,
                $el = self.$el;

            var rows = $el.find('tbody:last').find('tr');
            o.data = [];
            $.each(rows, function (rowIndex, row) {
                var data = $(row).find('td');
                var dataValues = [];
                $.each(data, function (dataIndex, dataValue) {
                    dataValues.push({Data: dataValue.innerHTML});
                });
                o.data.push({Values: dataValues, Hidden: false});
            });
        },

        _sortData: function (column, desc) {
            var self = this,
                o = self.options,
                _o = self._options,
                $el = self.$el;

            var dataSortFunction = function (a, b) {
                var aInt = +a.Values[column].Data.trim();
                var bInt = +b.Values[column].Data.trim();

                if (isNaN(aInt) || isNaN(bInt)) {
                    a = a.Values[column].Data.trim().toLowerCase();
                    b = b.Values[column].Data.trim().toLowerCase();
                } else {
                    a = aInt;
                    b = bInt;
                }

                if (a === b) return 0;
                else if (a > b) return 1;
                else return -1;
            };

            o.data.sort(dataSortFunction);
            if (desc) {
                o.data.reverse();
            }
            self._insertDataIntoTable();
        },

        _insertDataIntoTable: function () {
            var self = this,
                o = self.options,
                _o = self._options,
                $el = self.$el;

            if (o.data) {
                if (_o.rowsTemplate == null) {
                    $.get('js/MagicTable/Bodies/rows.html', null, function (data) {
                        _o.rowsTemplate = $(data);
                        $el.find("tbody:last").html(_o.rowsTemplate.render(o.data));
                    }, 'html');
                } else {
                    $el.find("tbody:last").html(_o.rowsTemplate.render(o.data));
                }
            }
        },

        _setUpBindings: function () {
            var self = this,
                o = self.options,
                _o = self._options,
                $el = self.$el;

            $(document).on(_o.id + "_filterUpdated", function (e, $el) {
                self._filterUpdated(e, $el);
            });

            if (o.isSortable) {
                var headers = $el.find('thead:first').find('th');
                $.each(headers, function (i, header) {
                    $(header).on('click',function () {
                        $(document).trigger(_o.id + "_sortingClicked", [i, header]);
                    }).addClass("magictable-sortable");
                });

                $(document).on(_o.id + "_sortingClicked", function (e, index, header) {
                    var $header = $(header);
                    if (_o.sortedBy === "asc") {
                        $el.find(".magictable-asc").removeClass("magictable-asc");
                    } else if (_o.sortedBy === "desc") {
                        $el.find(".magictable-desc").removeClass("magictable-desc");
                    }
                    if (_o.sortedCol === index) {
                        if (_o.sortedBy === null) {
                            _o.sortedBy = "asc"
                        } else if (_o.sortedBy === "asc") {
                            _o.sortedBy = "desc";
                        } else {
                            _o.sortedBy = "asc";
                        }
                    } else {
                        _o.sortedBy = "asc";
                    }
                    _o.sortedCol = index;
                    if (_o.sortedBy === "asc") {
                        $header.addClass("magictable-asc");
                    } else if (_o.sortedBy === "desc") {
                        $header.addClass("magictable-desc");
                    }
                    self._sortData(_o.sortedCol, _o.sortedBy === "desc");
                });
            }
        },

        _generateFilters: function () {
            var self = this,
                o = self.options,
                _o = self._options,
                $el = self.$el;

            var filterHtml = ["<tbody><tr class='magictable-filter-row'>"];
            var tdList = $el.find('tr:first').children(); //We're after your children!
            $.each(tdList, function (i) {
                filterHtml.push("<td><input type='text' data-tdnumber='");
                filterHtml.push(i);
                filterHtml.push("' class='magictable-filter-input' /></td>");
            });
            filterHtml.push("</tr></tbody>");
            $el.find('thead:first').after(filterHtml.join(""));

            var inputList = $('input');
            $.each(inputList, function (i, inputItem) {
                $(inputItem).keyup(function ($element) {
                    $(document).trigger(_o.id + "_filterUpdated", $element.target);
                });
            });
        },

        _filterUpdated: function (e, element) {
            var self = this,
                o = self.options,
                _o = self._options,
                $el = self.$el;

            var $element = $(element);

            var number = +$element.data('tdnumber');
            if (_o.updateFilterTimeoutDebounce[number]) {
                clearTimeout(_o.updateFilterTimeoutDebounce[number]);
            }
            _o.updateFilterTimeoutDebounce[number] = setTimeout(function () {
                var inputData = $element.val().toLowerCase();
                $.each(o.data, function (index, el) {
                    var shouldRemainHidden = false;
                    $.each(el.Values, function(i, value){
                        if(i === number){
                            if(value.Data.trim().toLowerCase().indexOf(inputData) === -1){
                                shouldRemainHidden = true;
                                value.Hidden = true;
                            }else{
                                value.Hidden = false;
                            }
                        }else{
                            if(value.Hidden){
                                shouldRemainHidden = true;
                            }
                        }
                    });
                    el.Hidden = shouldRemainHidden;
                });
                self._insertDataIntoTable();
            }, _o.updateFilterTimeout);
        },

        destroy: function () {
            var self = this,
                o = self.options,
                _o = self._options,
                $el = self.$el;

            $(document).off(_o.id + "_filterUpdated");
            $(document).off(_o.id + "_sortingClicked");
            $el.html(self.oldSelf);
            $el.removeClass("magictable");
        },

        _setOption: function (key, value) {

        }
    });
}(jQuery));