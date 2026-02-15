# mothertongue
A new take on AI-assisted programming in which you can write natural language and output working code in any language.

## How does it work?

`mothertongue` will watch your files. When you make an update to any `.mother` file, it will be sent to an LLM of your choosing and translated to the language of your choosing.

Simply run: `mothertongue .` in your project root and it'll do its magic.

## Workflow

Let's consider a scenario where I have the following directory structure:

```
/web_app/
    - models/
        - User.mother
    - package.json
    - node_modules/
    - index.mother
```

When `mothertongue` runs its translation process, all `.mother` files will be processed, creating an appropriate file for it. Consider `index.mother` has the following contents:

```mother
#!ts

#@ models/User

start:
- create User with username: "john"
#; output via stdout not console
- output user's username
```

You may notice some interesting syntax here. While `mothertongue` allows natural language, there is some syntactic sugar here that helps the LLM understand what you want.

### #! specifier

`#!` is ALWAYS the first line of a `.mother` file. This determines what language something is written in. If code is version-specific, it's worth mentioning that here too. Examples:

- `#!ts`
- `#!Go lang`
- `#!C# on .NET 10-preview`

The purpose of `#!` is strictly to inform the LLM as to what kind of file it will be writing.

### #@ specifier

`#@` is completely optional, but you'll likely want to use this one. It informs the LLM of an import elsewhere. Example:
```#@ models/User```. This tells the AI: "There's an import in `models/User` that we can have access to! Use it wisely. 

The `#@` specifier is special because when included in a `.mother` file, the AI is actually fed an entire, recursive directory tree of all files from the root project folder. **Ensure this is only being used where necessary.**

### #; specifier

`#;` has no particular function. It's goal is to provide the LLM additional context. The idea here is that `#;` will not be treated as regular instruction, wherein the LLM will not accidentally translate this natural language comment as code. Example:

```
#; ensure we are not using console.log

output "hello world!"
output "hello mars!"
output "the moon has water!"
```

