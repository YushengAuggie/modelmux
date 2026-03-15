# ModelMux Design Review

## APPROVED items

- The response panel already has the right product instinct: metrics, token usage, full text, and raw JSON all live in one clear inspection area.
- Provider pills, model cards, and message bubbles use a coherent visual language with rounded surfaces and restrained accent color.
- Dark mode has a solid base palette. The cyan accent reads clearly against the darker panels and gives the app a distinct identity.
- The app shell, cards, and sticky header make the tool feel more like a focused workspace than a generic form.
- The response-first desktop layout is directionally right for a testing tool where the output is the point.

## ISSUES

### High

1. SEND was not visually dominant enough for the primary action.
   The main CTA lived in the header alongside secondary utilities, so the request workflow had weak emphasis once you were editing content lower in the page.

2. Mobile likely opened on an empty response before the user could edit or send.
   On small screens the response column rendered before the controls, which makes first use feel backwards and pushes the actual action below the fold.

3. Light mode was not fully polished at boot.
   `index.html` shipped with `class="dark"`, so light mode users could get a dark flash before hydration. That makes the light theme feel secondary.

### Medium

4. Empty and loading states were underdesigned.
   The response area fell back to plain text only, which made the most important panel feel unfinished when idle or waiting on streaming output.

5. Input focus and interactive affordances needed stronger consistency.
   Buttons had some hover treatment, but form fields and toggles were less clearly interactive and less polished under keyboard navigation.

6. Some dense sections needed more breathing room.
   The request setup and prompting sections stacked a lot of controls without enough explanatory spacing, especially once model results grew.

### Low

7. Similar informational states were not always styled consistently.
   Some status states used pills, others plain helper text, and some empty states had no container styling at all.

## FIXES APPLIED

- Added a dedicated send panel in the request column with a larger CTA and keyboard shortcut hint so the main action is visible where work happens.
- Reordered mobile layout so request controls come before the response panel on small screens.
- Added response status feedback plus improved empty/loading states so the output area feels intentional before and during a request.
- Improved input focus, checkbox sizing, hover states, and reduced-motion handling for stronger accessibility and consistency.
- Limited the model result list height so long model sets do not crush nearby controls.
- Removed the hardcoded dark HTML class and added pre-hydration theme bootstrapping so light and dark mode both load cleanly.
