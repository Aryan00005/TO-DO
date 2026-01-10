import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import JavaScriptObfuscator from 'javascript-obfuscator'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'obfuscator',
      apply: 'build',
      generateBundle(options, bundle) {
        for (const fileName in bundle) {
          const chunk = bundle[fileName]
          if (chunk.type === 'chunk' && fileName.endsWith('.js')) {
            const obfuscatedResult = JavaScriptObfuscator.obfuscate(chunk.code, {
              compact: true,
              controlFlowFlattening: true,
              controlFlowFlatteningThreshold: 0.75,
              deadCodeInjection: true,
              deadCodeInjectionThreshold: 0.4,
              debugProtection: true,
              debugProtectionInterval: 4000,
              disableConsoleOutput: true,
              identifierNamesGenerator: 'hexadecimal',
              log: false,
              numbersToExpressions: true,
              renameGlobals: false,
              selfDefending: true,
              simplify: true,
              splitStrings: true,
              splitStringsChunkLength: 5,
              stringArray: true,
              stringArrayCallsTransform: true,
              stringArrayEncoding: ['base64'],
              stringArrayIndexShift: true,
              stringArrayRotate: true,
              stringArrayShuffle: true,
              stringArrayWrappersCount: 2,
              stringArrayWrappersChainedCalls: true,
              stringArrayWrappersParametersMaxCount: 4,
              stringArrayWrappersType: 'function',
              stringArrayThreshold: 0.75,
              transformObjectKeys: true,
              unicodeEscapeSequence: false
            })
            chunk.code = obfuscatedResult.getObfuscatedCode()
          }
        }
      }
    }
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});