---
marp: true
---

# Intro

Hello, my name is Anton and I've been doing FrontEnd since 2014. I notice that most of the speakers at events like this have decades of experience, but I am relatively new in the industry. I didn't catch the golden era of Ember.js, Knockout.js, Angular.js and the rest of the great libraries and frameworks of the time. The first framework I was working with was in-house made solution, inspired by Angular.js architecture with Handlebars as a template engine and jQuery to manage it. Soon after I start working with React and TypeScript, so I am happily doing my thing ever after.

---

# Problem definition

It is also worth mentioning that I used to be a fulltime Elm developer three years in a row. It was very nice DX and one of the nice things about Elm is that it does not give you any choice of how you manage the state in your application. There is the only way, and you either follow it or you are doomed.They call it the Elm Architecture and one of the key features is that each component has access to the state of its descendants.

Meanwhile in React, a component might not have any idea about what is going on with its children. And at some point when it becomes necessary, developers have to teach the parents how to talk to their children and how to listen to them. I would say this is one of the most common issues I've been solving over and over again on daily basis and on every project I worked.

---

# The Input

I am certainly sure that everyone in that room has been solving the same issue because every project has the Input component:

```tsx
const Input: React.FC<{
  type: "text" | "email" | "password"
  placeholder?: string
}> = ({ type, placeholder }) => {
  const [value, setValue] = React.useState("")

  return (
    <input
      className="brand-input"
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  )
}
```

Here the component defines the value state via `React.useState` and changes it whenever a user types something inside the input. Would it surprise you, if I tell that a parent component of the Input needs access to the value? No, it would not! Nobody needs an input that does not expose its value. Here we are exposing it thru the properties, so a parent component might talk to the Input alongside with the onChange callback, so the parent can listen to it.

```tsx
const Input: React.FC<{
  type: "text" | "email" | "password"
  placeholder?: string
  value: string
  onChange(value: string): void
}> = ({ type, placeholder, value, onChange }) => {
  return (
    <input
      className="brand-input"
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
```

It looks more familiar to what you have in your project's codebase, doesn't it?

# The SignUp form

Since we've removed the state definition outside of the state destination, we should now define the state somewhere else. It might be a parent component of the Input:

```tsx
const SearchForm: React.FC = () => {
  const [query, setQuery] = React.useState("")

  return (
    <form>
      <Input type="text" value={query} onChange={setQuery} />
      <button>Search</button>
    </form>
  )
}
```

Here we have a SearchForm component, it defines and passed down the value's state of the email Input together with the onChange callback.

---

# State definition and state destination

So now we have both state definition and state destination for the email input value.

```
SearchForm (definition)
     |
     | value
     | onChange
     v
   Input (destination)
```

In reality it often happens that the distance between definition and destination is long, so the state and state setter should travel all the way down from somewhere higher in the React component tree:

```
(_) ComponentA - definition
 | state
 | setState
 v
(_) ComponentB
 | state
 | setState
 v
(_) ComponentC
 | state
 | setState
 v
(_) ComponentD
 | state
 | setState
 v
(_) ComponentE - destination
```

---

# Props drilling

In that case all of the components between state definition and state destinations should pass down the state and setter. That pattern is known as props drilling and it is a nightmare for many React developers. The pitfall of the pattern appears when it needs to extend a component's behavior somewhere in the drilling chain:

```
(_) ComponentA - definition
 | stateE
 | setStateE
 | stateF
 | setStateF
 v
(_) ComponentB
 | stateE
 | setStateE
 | stateF
 | setStateF
 v
(_) ComponentC
 | stateE
 | setStateE
 | stateF
 | setStateF
 v
(_) ComponentD
 |--------------+ stateF
 |              | setStateF
 | stateE       v
 | setStateE   (_) ComponentF - destination
 v
(_) ComponentE - destination
```

It requires to drill down both the new piece of state and the state setter from the very top of the components tree to bottom. It is very boring and time consuming.

---

# Rerendering

If the props drilling didn't stop you from following that approach, perhaps performance degradation caused by unnecessary re-renders does. Updating a state defined via `React.useState` is one of the React re-rendering triggers. Every time a component re-renders, it causes all children to re-render. That chain reaction goes until it reaches the bottom of the components tree. So the higher we raise the state definition the wider components tree requires to re-render on every state update.

```
      [_____1_____] - definition
     /      |     \
  (_2_)   (_6_)   (12)
  /  |     |  \     \
(3) (5)   (7) (11)  (13)
 |         |
(4)      (_8_)
         /   \
       (9)   <10> - destination
```

Re-renders are not bad, this is how React guarantees that every component represents its state+props combination correctly. But in some cases the performance might degrade too much. The well-known workaround is to apply `React.memo` to the "heavy" components, so they don't re-render every time their props change. With aggressive memoization it is possible to avoid the entire tree from rerendering, but the branch between state definition and state destination will re-render anyway

```
      [_____1_____] - definition
     /      |     \
  {___}   (_2_)   {_}
  /  |     |  \     \
(_) (_)   (3) {_}   (_)
 |         |
(_)      (_4_)
         /   \
       {_}   <5>  destination
```

Even the most optimal memoization strategy is an overhead, but without it the app might be irresponsive in certain cases. Overall that approach has two disadvantages coming with it:

1. 🔴 Props drilling
2. 🔴 Performance degradation
3. 🟡 Memoization overhead

---

# Improvement #1

We've already discovered that each drilled piece of state needs a setter function to pass along the way. That fact alone doubles number of drilled properties, but we can improve it by merging all states definitions to one and pass a universal callback that will update the state. We will name the callback `dispatch`, it takes an action as a single argument and then a `reducer` function will apply the action to update the state. Sounds familiar, does not it? All we have to do is to replace all `React.useState` definitions with a single `React.useReducer` in the top component in the components tree.

```
(_) ComponentA - definition
 | state
 | dispatch
 v
(_) ComponentB
 | state
 | dispatch
 v
(_) ComponentC
 | state
 | dispatch
 v
(_) ComponentD
 |--------------+ state.F
 |              | dispatch
 | state.E       v
 | dispatch    (_) ComponentF - destination
 v
(_) ComponentE - destination
```

It is definitely an improvement, but we paid for it by introducing actions and the reducer function and this is going to be a lot of boilerplate code. Props drilling is still in place and it still causes pain every time we extend the app behavior.

1. 🔴 Props drilling (slightly better)
2. 🔴 Performance degradation
3. 🔴 Boilerplate code
4. 🟡 Memoization overhead

---

# Improvement #2

It might be a bit annoying to drill `dispatch` because it is always the same function for any component using it. Pretty obvious improvement is to put dispatch into the context and extract it in places where it is needed:

```
  (_) ComponentA - definition
   |----------> {DispatchContext}
   |                   |
   | state             | dispatch
   |                   v
+--v------------------------------------------+
| (_) ComponentB                              |
|  | state                                    |
|  v                                          |
| (_) ComponentC                              |
|  | state                                    |
|  v                                          |
| (_) ComponentD                              |
|  |--------------+ state.F                   |
|  | state.E      v                           |
|  |             (_) ComponentF - destination |
|  v                                          |
| (_) ComponentE - destination                |
+---------------------------------------------+
```

That's an improvement, but the tradeoffs are still in place, and we got a new one. As soon as React context is involved writing tests and stories becomes a bit harder, because we need to pass the context into them.

1. 🔴 Props drilling (slightly better x2)
2. 🔴 Performance degradation
3. 🔴 Boilerplate code
4. 🟡 Testing and sandboxing is harder (requires DispatchContext)
5. 🟡 Memoization overhead

---

# Improvement #3

Since we have already got the context in place, why would not we pass the whole state thru it alongside the dispatch function? This way the state goes right to the destination avoiding the whole drilling chain:

```
  (_) ComponentA - definition
   |----------> {StoreContext}
   |                   | state
   |                   | dispatch
   |                   v
+--v------------------------------------------+
| (_) ComponentB                              |
|  |                                          |
|  v                                          |
| (_) ComponentC                              |
|  |                                          |
|  v                                          |
| (_) ComponentD                              |
|  |--------------+                           |
|  |              v                           |
|  |             (_) ComponentF - destination |
|  v                                          |
| (_) ComponentE - destination                |
+---------------------------------------------+
```

Finally, the props drilling is gone! Without the drilled props performance get slightly improved - so now only components that extracts a state via `useState` will re-render on each state update. Component can extract its state via the useState hook which is good. But all of a sudden those components should know their place inside the bigger state which is questionable - it breaks a component's encapsulation and gives too much power to query anything from the state. Eventually it couples a component to the entire codebase, so next time you need to modify the global state, it might cause you to modify many `useStore` calls. Not only that, in tests and stories we have to define the whole state, even if we test and sandbox a little piece of UI.

1. 🔴 Boilerplate code
2. 🔴 Performance degradation (improved)
3. 🔴 Component encapsulation is broken
4. 🟡 Testing and sandboxing is harder (requires StoreContext with the whole state definition)
5. 🟡 Memoization overhead

---

# Improvement #4

Ideally, a component should not re-render when not relevant state updates. To do so, we should move the state outside of a React component and introduce `useSelector` hook. The hook will select a piece of state and enqueue re-render only when the selected state changes. It should sound familiar to you if you've ever used React+Redux combination.

Here is how it works: every time when the state changes, all selectors run and select a piece of state. Then they compare the selected state with what was selected before the change and in case if a new selection is different, they enqueue a re-render.

<- draw the steps ->

1. 🔴 Boilerplate code
2. 🔴 Component encapsulation is broken
3. 🟡 Testing and sandboxing is harder (requires StoreContext with the whole state definition)
4. 🟡 ~~Memoization overhead~~ Selection overhead

---

# Improvement #5
