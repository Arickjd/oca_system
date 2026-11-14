// Carrega módulos TypeScript do projeto em Node puro (testes), resolvendo
// imports relativos e o alias "@/", com substituições para dependências caras.
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

function criarLoader(raiz, substituicoes = {}) {
  const cache = new Map();
  function carregar(arquivo) {
    const base = path.resolve(raiz, arquivo);
    const filename = /\.(ts|tsx)$/.test(base) ? base : `${base}.ts`;
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = new Module(filename, module);
    mod.filename = filename;
    mod.paths = module.paths;
    cache.set(filename, mod);
    mod.require = nome => {
      if (Object.hasOwn(substituicoes, nome)) return substituicoes[nome];
      if (nome.startsWith("@/")) return carregar(path.join("src", nome.slice(2)));
      if (nome.startsWith(".")) return carregar(path.resolve(path.dirname(filename), nome));
      return require(nome);
    };
    const fonte = fs.readFileSync(filename, "utf8");
    mod._compile(ts.transpileModule(fonte, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
    }).outputText, filename);
    return mod.exports;
  }
  return carregar;
}

module.exports = { criarLoader };
