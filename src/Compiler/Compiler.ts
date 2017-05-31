import {ICompiler, ICompilerResult} from "./Interface/ICompiler";
import {IContainerReferenceFinder} from "../ContainerReferenceFinder/Interface/IContainerReferenceFinder";
import {IServiceExpressionFinder} from "../ServiceExpressionFinder/Interface/IServiceExpressionFinder";
import {IMappedInterfaceToImplementationMap, IServiceExpressionUpdater} from "../ServiceExpressionUpdater/Interface/IServiceExpressionUpdater";
import {IClassConstructorArgumentsStringifier} from "../ClassConstructorArgumentsStringifier/Interface/IClassConstructorArgumentsStringifier";
import {IClassConstructorArgumentsValidator} from "../ClassConstructorArgumentsValidator/Interface/IClassConstructorArgumentsValidator";
import {BindingIdentifier, ClassIndexer, ICodeAnalyzer} from "@wessberg/codeanalyzer";
import {IPathValidator, PathValidator} from "@wessberg/compiler-common";

/**
 * The compiler will upgrade the source code. It looks for every time a service is registered and mimics reflection.
 * Also, it tracks the constructor arguments of classes, decides if they should be dependency injected and if so the order in which
 * to do that.
 * @author Frederik Wessberg
 */
export class Compiler implements ICompiler {
	private static classes: ClassIndexer = {};
	private static resolvedPaths: Set<string> = new Set();
	private static readonly mappedInterfaces: IMappedInterfaceToImplementationMap = {};
	private pathValidator: IPathValidator = new PathValidator();

	constructor (private host: ICodeAnalyzer,
							 private containerReferenceFinder: IContainerReferenceFinder,
							 private serviceExpressionFinder: IServiceExpressionFinder,
							 private serviceExpressionUpdater: IServiceExpressionUpdater,
							 private classConstructorArgumentsValidator: IClassConstructorArgumentsValidator,
							 private classConstructorArgumentsStringifier: IClassConstructorArgumentsStringifier) {
	}

	/**
	 * Validates that all constructor references to services are actually being registered as services
	 * before then moving on to generating a map between class/service identifiers and the ordered dependencies
	 * that should be dependency injected. It returns a map so that it can be added to the top of a code bundle.
	 * @returns {string}
	 */
	public getClassConstructorArgumentsMapStringified (): string {
		this.classConstructorArgumentsValidator.validate(Compiler.classes, Compiler.mappedInterfaces);
		return this.classConstructorArgumentsStringifier.getClassConstructorArgumentsStringified(Compiler.classes, Compiler.mappedInterfaces);
	}

	/**
	 * The consumable method that upgrades the code as per the class description.
	 * @param {string} filepath
	 * @param {ICompilerResult} codeContainer
	 * @returns {ICompilerResult}
	 */
	public compile (filepath: string, codeContainer: ICompilerResult): ICompilerResult {
		if (this.pathValidator.isBlacklisted(filepath)) return {hasAltered: false, code: codeContainer.code};

		const code = codeContainer.code.toString();
		const {host} = this;
		const statements = host.addFile(filepath, code);
		this.resolveDependencies(filepath);

		// Finds all references to the DIContainer instance.
		const identifiers = this.containerReferenceFinder.find({host, statements});

		// Finds (and validates) all expressions that has a relation to the DIContainer instance.
		const expressions = this.serviceExpressionFinder.find({host, statements, identifiers, filepath});

		// Updates all expressions.
		this.serviceExpressionUpdater.update({codeContainer, expressions, classes: Compiler.classes, mappedInterfaces: Compiler.mappedInterfaces});

		return codeContainer;
	}

	private resolveDependencies (filepath: string): void {
		Compiler.resolvedPaths.add(filepath);
		const imports = this.host.getImportDeclarationsForFile(filepath, true);
		const exports = this.host.getExportDeclarationsForFile(filepath, true);

		// Take all relevant import paths.
		const importPaths: string[] = imports.map(importDeclaration => {
			if (importDeclaration.source instanceof BindingIdentifier) return "";
			return importDeclaration.source.fullPath();
		}).filter(part => part.length > 0);

		// Take all relevant export paths.
		const exportPaths: string[] = exports.map(exportDeclaration => {
			if (exportDeclaration.source instanceof BindingIdentifier) return "";
			const fullPath = exportDeclaration.source.fullPath();
			if (fullPath === exportDeclaration.filePath) return "";
			return fullPath;
		}).filter(part => part.length > 0);

		// Dedupe and add with existing filepath.
		const paths = new Set([filepath, ...importPaths, ...exportPaths]);

		// Tracks class declarations so we can extract their constructor arguments and decide if we should dependency inject them.
		paths.forEach(path => {
			const classes = this.host.getClassDeclarationsForFile(path, true);
			Object.assign(Compiler.classes, classes);

			// Recurse all through the tree of dependencies.
			if (!Compiler.resolvedPaths.has(path)) this.resolveDependencies(path);
		});
	}

}