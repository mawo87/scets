var SetVis = (function(vis) {

	function Table(initializer) {
		this.$container = $(initializer.container);
		this.tableClass = initializer.tableClass || "";
		this.colNames = ["Name", "Degree", "Sets"];
		this.elements = initializer.elements || [];
		this.init();
	}

	Table.prototype = {
		init: function() {
			$table = $('<table>')
				.addClass(this.tableClass)
				.append('<thead>')
				.append('<tbody>');

			this.$container.html($table);
			this.appendTableHead();
			this.update(this.elements);
		},
		appendTableHead: function() {
			var $thead = this.$container.find('thead'),
				content = "<tr>";
			for (var i = 0, len = this.colNames.length; i < len; i++) {
				content += "<th>" + this.colNames[i] + "</th>";
			}
			content += "</tr>";
			$thead.append(content);
		},
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
		},
		clear: function() {
			this.$container.find('tbody').empty();
		}
	};

	return $.extend(vis, {
		Table: Table
	});

})(SetVis || vis);