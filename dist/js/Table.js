var scats = (function(vis) {

	/**
	 * @class Table
	 * @classDesc The table class
	 * @memberOf scats
	 *
	 * @property {object} $container - A jquery object
	 * @property {string} tableClass - An optional classname.
	 * @property {array} colnames - An array of column names shown in the table header.
	 * @property {array} elements - The elements array.
	 * @params {object} initializer - An object to pass properties for initialization
	 */
	function Table(initializer) {
		this.$container = $(initializer.container);
		this.tableClass = initializer.tableClass || "";
		this.colNames = ["Name", "Degree", "Sets"];
		this.elements = initializer.elements || [];
		this.init();
	}

	Table.prototype = {

		/**
		 * The initialization method of the table, which will be called directly when a new instance is created.
		 *
		 * @memberOf scats.Table
		 * @returns {scats.Table} - The table object itself.
		 * @method init
		 */
		init: function() {
			$table = $('<table>')
				.addClass(this.tableClass)
				.append('<thead>')
				.append('<tbody>');

			this.$container.html($table);
			this.appendTableHead();
			this.update(this.elements);

			return this;
		},
		/**
		 * Appends a header row to the table.
		 *
		 * @memberOf scats.Table
		 * @returns {scats.Table} - The table object itself.
		 * @method appendTableHead
		 */
		appendTableHead: function() {
			var $thead = this.$container.find('thead'),
				content = "<tr>";
			for (var i = 0, len = this.colNames.length; i < len; i++) {
				content += "<th>" + this.colNames[i] + "</th>";
			}
			content += "</tr>";
			$thead.append(content);

			return this;
		},
		/**
		 * Updates the table content with the passed elements array.
		 *
		 * @memberOf scats.Table
		 * @param {array} elements - An array of elements that has to be presented in the table.
		 * @returns {scats.Table} - The table object itself.
		 * @method update
		 */
		update: function(elements) {
			this.elements = elements;

			var arr = [];
			for (var i = 0, len = this.elements.length; i < len; i++) {
				arr.push("<tr>");
				arr.push("<td>" + this.elements[i].name + "</td>");
				arr.push("<td>" + this.elements[i].degree + "</td>");
				arr.push("<td>" + this.elements[i].sets.join(", ") + "</td>");
				arr.push("</tr>");
			}

			this.$container.find('tbody')
				.empty()
				.html(arr.join(""));

			return this;
		},
		/**
		 * Empties the content of the table body.
		 *
		 * @memberOf scats.Table
		 * @returns {scats.Table} - The table object itself.
		 * @method clear
		 */
		clear: function() {
			this.$container.find('tbody').empty();
			return this;
		}
	};

	return $.extend(vis, {
		Table: Table
	});

})(scats || vis);