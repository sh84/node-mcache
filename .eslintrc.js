// Reference ESLint configuration file
// May be used for NodeJS or frontend (browser) development with jQuery
// 
// Date: 2016-02-28
// Contributors: sh84@inventos.ru

module.exports = {
	rules: {
		"no-console": 0,
		"no-extra-parens": 1,
		"no-extra-parens": [2, "functions"],
		"no-unexpected-multiline": 2,
		"accessor-pairs": 2,

		"block-scoped-var": 2,
		"default-case": 2,
		"no-caller": 2,
		"no-extend-native": 2,
		"no-invalid-this": 1,
		"no-labels": 2,
		"no-multi-spaces": [1, {exceptions: {Property: true, VariableDeclarator: true}}],
		"no-native-reassign": 2,
		"no-new-wrappers": 2,
		"no-floating-decimal": 2,
		"no-param-reassign": 1,
		"no-return-assign": [2, "always"],
		"no-self-compare": 2,
		"no-throw-literal": 2,
		"no-useless-call": 2,
		"no-unused-expressions": [1, {allowShortCircuit: true, allowTernary: true}],
		"no-useless-concat": 2,
		"no-void": 2,
		"no-warning-comments": 1,
		//"no-with": 2, == WithStatement
		//"vars-on-top": 1,
		"wrap-iife": [2, "inside"],
		//"yoda": [2, "always", {onlyEquality: true}],
		"no-unused-vars": [2, {vars: "local", args: "after-used"}],
		"no-shadow-restricted-names": 2,
		"no-shadow": 2,
		"no-undefined": 0,
		"no-use-before-define": [2, "nofunc"],
		"handle-callback-err": [2, "^(err|error)$"],
		"no-new-require": 1,
		"no-path-concat": 1,

		"array-bracket-spacing": [1, "never"],
		"block-spacing": [1, "always"],
		"brace-style": [1, "1tbs", {allowSingleLine: true}],
		"comma-spacing": [1, {before: false, after: true}],
		"comma-style": [1, "last"],
		"computed-property-spacing": [1, "never"],
		"indent": 0,
		"key-spacing": [1, {beforeColon: false, afterColon: true, mode: "minimum"}],
		"linebreak-style": [1, "unix"],
		"max-depth": [1, 8],
		"max-nested-callbacks": [1, 5],
		"max-len": [1, 100, 2, {ignoreComments: true, ignoreUrls: true}],
		"max-params": [1, 5],
		"max-statements": [1, 20],
		"new-cap": 1,
		"new-parens": 1,
		"no-array-constructor": 1,
		"no-lonely-if": 1,
		"no-mixed-spaces-and-tabs": [1, "smart-tabs"],
		"no-multiple-empty-lines": [1, {max: 2}],
		"no-new-object": 1,
		"no-restricted-syntax": [2, "WithStatement"],
		"no-spaced-func": 2,
		//"no-trailing-spaces": [1, { "skipBlankLines": true }],
		"no-unneeded-ternary": 1,
		"object-curly-spacing": [1, "never"],
		"operator-linebreak": [1, "after"],
		"quote-props": [1, "consistent-as-needed"],
		"semi-spacing": 1,
		"semi": [2, "always"],
		"space-before-blocks": 1,
		"space-before-function-paren": [1, "never"],
		"space-unary-ops": 1,
		"spaced-comment": [1, "always", {
			line: {markers: ["="]}
		}],
		"keyword-spacing": 1,
		// for es6
		"no-inner-declarations": 1 // temporary, in newest js it's correct
	},
	parserOptions: {
		sourceType: "module"
	},
	env: {
		es6:     true,
		node:    true,
		browser: true,
		jquery:  true
	},
	extends: "eslint:recommended"
};
