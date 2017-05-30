# DI-Compiler (The compiler for DI) [![NPM version][npm-image]][npm-url]
> The compiler for [DI](https://www.npmjs.com/package/@wessberg/di)

## Installation
Simply do: `npm install @wessberg/di-compiler`.

## Usage
```typescript
import {compile, getIntro} from "@wessberg/di-compiler";

// The 'compile' method will upgrade all service registrations and 'get' calls
// throughout the code
const compiled = compile(
	"a_file.ts", `
	class Foo implements IFoo {}
	DIContainer.registerSingleton<IFoo, Foo>();
	`);

// The intro is a map between interface names and the constructor arguments
// of their concrete implementations. Should only be injected once in your code
// and at best in top of your bundle.
const intro = getIntro();
```

## Changelog:

**v1.0.6**:

- The Compiler will now parse all imports for classes before proceeding.
- The Compiler will now check if another global constructor arguments map exists and assign to it if it exists instead of overwriting it.

**v1.0.5**:

- Bumped CodeAnalyzer dependency to ^v1.0.17
- Bumped DI dependency to ^v1.0.16
- `has` expressions can now be handled.

**v1.0.4**:

- Bumped CodeAnalyzer dependency to ^v1.0.11

**v1.0.3**:

- Bumped CodeAnalyzer dependency to ^v1.0.10

**v1.0.2**:

- Bumped CodeAnalyzer dependency to ^v1.0.9

**v1.0.1**:

- Fixed an issue where the found class declarations would be reset for each new file.

**v1.0.0**:

- First release.

[npm-url]: https://npmjs.org/package/@wessberg/di-compiler
[npm-image]: https://badge.fury.io/js/@wessberg/di-compiler.svg