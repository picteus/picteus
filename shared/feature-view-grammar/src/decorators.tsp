import "../dist/emitter/decorators.js";

using TypeSpec.Reflection;

namespace Picteus.FeatureViewGrammar;

/** Marks a model as the root composition container for fluent builder generation. */
extern dec dslRoot(target: Model);

/** Declares an ergonomic DSL function alias for this model. */
extern dec dslAlias(target: Model, name: valueof string);

/** Excludes a model from public DSL factory generation (e.g. internal specimen fixtures). */
extern dec dslIgnore(target: Model);
