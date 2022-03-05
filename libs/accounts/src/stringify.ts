// From https://github.com/sapegin/q-i/blob/master/index.js,
// with my tweaks to change number color (cyan doesn't look good on white browser):

import { isPlainObject }from 'is-plain-object'
import ansi from 'ansi-styles'
import isRegexp from 'is-regexp';
import isObject from 'is-obj';
import getOwnEnumPropSymbols from 'get-own-enumerable-property-symbols';


type Color = 
  'magenta' | 
  'cyan' |
  'yellow' |
  'red' | 
  'green' |
  'blue' |
  'gray' | 
  'grey' |
  'white';


const internals = ['Array', 'Object', 'Function'];

const style = (v: any, s: 'bold' | 'italic' | 'dim') => `${ansi[s].open}${v}${ansi[s].close}`;

const color = (v: any, c: Color) => `${ansi.color[c].open}${v}${ansi.color.close}`;

const getArraySize = (o: any) => Array.isArray(o) && o.length;

const getObjectSize = (o: any) => isPlainObject(o) && Object.keys(o).length;

const getFunctionSize = (o: any) => typeof o === 'function' && o.toString().split('\n').length;

const getConstructor = (v: any) => {
	if (v === null) {
		return 'Null';
	}

	if (v === undefined) {
		return 'Undefined';
	}

	return v.constructor && v.constructor.name;
};

const printers = {
	Null: (v: null) => style(v, 'italic'),
	Undefined: (v: undefined) => style(v, 'italic'),
	Boolean: (v: boolean) => color(v, 'magenta'),
	Number: (v: number) => color(v, 'magenta'),
	String: (v: string) => color(v, 'green'),
	RegExp: (v: RegExp)  => color(v, 'yellow'),
};

export function stringify(object: object, options?: {maxItems?: number, maxLines?: number}) {
	const maxItems = (options && options.maxItems) || 30;
	const maxLines = (options && options.maxLines) || 1;

	return stringifyObject(object, {
		indent: '  ',
		transform: (obj, key, originalResult) => {
			const value = (obj as any)[key];

			const arraySize = getArraySize(value);
			if (arraySize > maxItems) {
				return [key, style(`Array[${arraySize}]`, 'dim')];
			}

			const objectSize = getObjectSize(value);
			if (objectSize > maxItems) {
				return style(`Object {${objectSize}}`, 'dim');
			}

			const functionSize = getFunctionSize(value);
			if (functionSize > maxLines) {
				return style(`Function ${value.name || ''}`, 'dim');
			}

			const ctr: string = getConstructor(value);

			if (typeof (printers as any)[ctr] === 'function') {
				return (printers as any)[ctr](originalResult);
			}

			if (ctr && internals.indexOf(ctr) === -1) {
				return `${ctr} ${originalResult}`;
			}

			return originalResult;
		},
	});
}

type Options = {
  indent?: string,
  singleQuotes?: boolean,
  filter?: (obj: any, prop: string | symbol) => boolean,
  transform?: ( obj: object | any[], prop: string | number | symbol, originalResult: string ) => string,
  inlineCharacterLimit?: number,
};

function stringifyObject(input: object | any[], options: Options, pad?: string) {
	const seen: any[] = [];

	return (function stringifyObjectInternal(input: any, options: Options = {}, pad = ''): string {
		const indent = options.indent || '\t';

		let tokens: {
      newline: string,
      newlineOrSpace: string,
      pad: string,
      indent: string,
    };
		if (options.inlineCharacterLimit === undefined) {
			tokens = {
				newline: '\n',
				newlineOrSpace: '\n',
				pad,
				indent: pad + indent,
			};
		} else {
			tokens = {
				newline: '@@__STRINGIFY_OBJECT_NEW_LINE__@@',
				newlineOrSpace: '@@__STRINGIFY_OBJECT_NEW_LINE_OR_SPACE__@@',
				pad: '@@__STRINGIFY_OBJECT_PAD__@@',
				indent: '@@__STRINGIFY_OBJECT_INDENT__@@',
			};
		}

		const expandWhiteSpace = (string: string): string => {
			if (options.inlineCharacterLimit === undefined) {
				return string;
			}

			const oneLined = string
				.replace(new RegExp(tokens.newline, 'g'), '')
				.replace(new RegExp(tokens.newlineOrSpace, 'g'), ' ')
				.replace(new RegExp(tokens.pad + '|' + tokens.indent, 'g'), '');

			if (oneLined.length <= options.inlineCharacterLimit) {
				return oneLined;
			}

			return string
				.replace(new RegExp(tokens.newline + '|' + tokens.newlineOrSpace, 'g'), '\n')
				.replace(new RegExp(tokens.pad, 'g'), pad)
				.replace(new RegExp(tokens.indent, 'g'), pad + indent);
		};

		if (seen.includes(input)) {
			return '"[Circular]"';
		}

		if (
			input === null
			|| input === undefined
			|| typeof input === 'number'
			|| typeof input === 'boolean'
			|| typeof input === 'function'
			|| typeof input === 'symbol'
			|| isRegexp(input)
		) {
			return String(input);
		}

		if (input instanceof Date) {
			return `new Date('${input.toISOString()}')`;
		}

		if (Array.isArray(input)) {
			if (input.length === 0) {
				return '[]';
			}

			seen.push(input);

			const returnValue = '[' + tokens.newline + input.map((element, i) => {
				const eol = (input as any[]).length - 1 === i ? tokens.newline : ',' + tokens.newlineOrSpace;

				let value = stringifyObjectInternal(element, options, pad + indent);
				if (options.transform) {
					value = options.transform(input, i, value);
				}

				return tokens.indent + value + eol;
			}).join('') + tokens.pad + ']';

			seen.pop();

			return expandWhiteSpace(returnValue);
		}

		if (isObject(input)) {
			let objectKeys = [
				...Object.keys(input),
				...getOwnEnumPropSymbols(input),
			];

			if (options.filter) {
				// eslint-disable-next-line unicorn/no-array-callback-reference, unicorn/no-array-method-this-argument
				objectKeys = objectKeys.filter(element => options.filter!(input, element));
			}

			if (objectKeys.length === 0) {
				return '{}';
			}

			seen.push(input);

			const returnValue = '{' + tokens.newline + objectKeys.map((element, i) => {
				const eol = objectKeys.length - 1 === i ? tokens.newline : ',' + tokens.newlineOrSpace;
				const isSymbol = typeof element === 'symbol';
				const isClassic = !isSymbol && /^[a-z$_][$\w]*$/i.test(element);
				const key = isSymbol || isClassic ? element : stringifyObjectInternal(element, options);

				let value = stringifyObjectInternal((input as any)[element], options, pad + indent);
				if (options.transform) {
					value = options.transform(input, element, value);
				}

				return tokens.indent + String(key) + ': ' + value + eol;
			}).join('') + tokens.pad + '}';

			seen.pop();

			return expandWhiteSpace(returnValue);
		}

		input = input.replace(/\\/g, '\\\\');
		input = String(input).replace(/[\r\n]/g, x => x === '\n' ? '\\n' : '\\r');

		if (options.singleQuotes === false) {
			input = input.replace(/"/g, '\\"');
			return `"${input}"`;
		}

		input = input.replace(/'/g, '\\\'');
		return `'${input}'`;
	})(input, options, pad);
}

