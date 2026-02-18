export function detectLang(code) {
  if (/^\s*(def |class |import |from |if __name__|print\()/m.test(code))           return 'python'
  if (/^\s*(function |const |let |var |=>|require\(|module\.exports)/m.test(code)) return 'javascript'
  if (/^\s*(public |private |class |interface |void |int |String |import java)/m.test(code)) return 'java'
  if (/^\s*(fn |let mut |use |impl |pub |struct |enum )/m.test(code))               return 'rust'
  if (/^\s*(func |package |import \(|:=)/m.test(code))                              return 'go'
  if (/^\s*(#include|int main|std::|cout|cin)/m.test(code))                         return 'cpp'
  if (/^\s*(<\?php|echo |function |namespace )/m.test(code))                        return 'php'
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)/im.test(code))                  return 'sql'
  if (/^\s*(<[a-zA-Z]|<!DOCTYPE)/i.test(code))                                      return 'html'
  if (/^\s*(\.|#)[a-z-]+\s*\{/m.test(code))                                         return 'css'
  if (/^\s*[$\\@]/.test(code))                                                       return 'bash'
  return 'plaintext'
}
