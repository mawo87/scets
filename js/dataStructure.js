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

	return $.extend(vis, {
		Element: Element,
		Set: Set,
		SubSet: SubSet,
		Selection: Selection,
		Aggregate: Aggregate
	});

})(scats || {});