var scats = (function(vis) {

	/**
	 * @class Element
	 * @classDesc Represents an element from the input data
	 * @memberOf scats
	 *
	 * @property {string} id - The unique identifier of the element.
	 * @property {string} name - The element's name.
	 * @property {array} sets - An array of sets this element belongs to.
	 * @property {int} degree - The elements degree, i.e, degree level 2 means that it belongs to two sets
	 * @method getSets
	 * @params {string} id - A unique identifier.
	 * @params {string} name - The element's name.
	 */
	function Element(id, name) {
		this.id = id;
		this.name = name;
		this.sets = [];
		this.degree = -1;
		this.getSets = function () {
			return this.sets.join(",");
		};
	}

	/**
	 * @class Set
	 * @classDesc Represents a set in.
	 * @memberOf scats
	 *
	 * @property {string} name - The set's name.
	 * @property {int} count - The number of elements the set contains.
	 * @params {string} name - The set's name.
	 */
	function Set(name) {
		this.name = name;
		this.count = 0;
	}

	/**
	 * @class SubSet
	 * @classDesc Represents a set in.
	 * @memberOf scats
	 *
	 * @property {string} set_name - The name of the set it belongs to.
	 * @property {int} degree - he subset's degree.
	 * @property {array} elements - An array of elements this subset holds.
	 * @property {int} count - The number of elements this subset holds.
	 * @params {string} set_name - The name of the set it belongs to.
	 * @params {int} degree - The subset's degree.
	 */
	function SubSet(set_name, degree) {
		this.set_name = set_name;
		this.degree = degree;
		this.elements = [];
		this.count = 0;
	}

	SubSet.prototype = {

		/**
		 * Creates a map from set name to number of elements, i.e., { Set1: 24, ... }
		 *
		 * @memberOf scats.Subset
		 * @deprecated
		 */
		getSetOccurrenceMap: function() {
			var setMap = {};

			var duplicates_eliminated = [];
			for (var i = 0, set_str = "", len = this.elements.length; i < len; i++) {
				set_str = this.elements[i].getSets();
				if ($.inArray(set_str, duplicates_eliminated) == -1) {
					duplicates_eliminated.push(set_str);
				}
			}
			console.log("duplicates_eliminated ", duplicates_eliminated);

			for (var i = 0, len = this.elements.length; i < len; i++) {
				console.log("split ", this.elements[i].getSets().split(","));

				console.log("this.elements[i] ", this.elements[i]);

				var foundPos = $.inArray(this.elements[i].getSets(), duplicates_eliminated);

				if (foundPos != -1) {

					duplicates_eliminated[foundPos] = undefined;

					$(this.elements[i].getSets().split(",")).each(function(k, v) {

						if (setMap[v] !== undefined) {
							setMap[v]++;
						} else {
							setMap[v] = 1;
						}
					});
				}

			}
			return setMap;
		},
		/**
		 * Returns the element names of this subset.
		 *
		 * @memberOf scats.Subset
		 * @deprecated
		 */
		getElementNames: function() {
			/*
			 var result = [];
			 for (var i = 0, el, len = this.elements.length; i < len; i++) {
			 el = this.elements[i];
			 if ($.inArray(el.name, result) == -1) {
			 result.push(el.name);
			 }
			 }
			 return result;
			 */

			return $.unique(this.elements.map(function(e) {
				return e.name;
			}));
		}
	};

	/**
	 * @class Aggregate
	 * @classDesc Represents an aggregate (can store multiple subsets).
	 * @memberOf scats
	 *
	 * @property {int} count - The number of subsets this aggregate holds.
	 * @property {array} subsets - An array of subsets this aggregate holds.
	 */
	function Aggregate() {
		this.count = 0;
		this.subsets = [];
	}

	Aggregate.prototype = {
		/**
		 * Adds a subset to the aggregate
		 *
		 * @memberOf scats.Aggregate
		 * @returns {scats.Subset} - The subset to be added.
		 * @method addSubset
		 */
		addSubset: function(subset) {
			this.subsets.push(subset);
			this.count += subset.count;
		}
	};

	/**
	 * @class Selection
	 * @classDesc Represents a selection.
	 * @memberOf scats
	 *
	 * @deprecated
	 */
	function Selection(set, degree) {
		this.set = (set === undefined) ? "" : set;
		this.degree = (degree === undefined) ? -1 : degree;
		this.elements = [];
		this.toString = function () {
			if (this.degree <= 0) { return this.set; }
			if (this.set === "") { return "degree-" + this.degree; }
			return this.set + "[" + this.degree + "]";
		};

	}

	return $.extend(vis, {
		Element: Element,
		Set: Set,
		SubSet: SubSet,
		Selection: Selection,
		Aggregate: Aggregate
	});

})(scats || vis);