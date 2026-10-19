// G-23 (Chris, 2026-10-17): a name field that never holds more than `max` characters, typed or
// pasted -- the same rule as group rename. Stock public API only: createInputBox() with prompt and placeHolder plus the cut.
import { QuickInputService } from '@theia/core/lib/common/quick-pick-service';

// The type admits only the two options the body forwards; a caller needing value, title or validateInput must extend the helper.
export function inputCappedName(quickInput: QuickInputService, options: { prompt?: string; placeHolder?: string }, max: number): Promise<string | undefined> {
    return new Promise(resolve => {
        const box = quickInput.createInputBox();
        let accepted: string | undefined;
        box.prompt = options.prompt;
        box.placeholder = options.placeHolder;
        // shortcut: the cut keeps the first `max` characters and moves the caret to the end (23-UI-SPEC A1); restore valueSelection if Chris asks for the caret to stay
        box.onDidChangeValue(value => {
            if (value.length > max) {
                box.value = value.slice(0, max);
            }
        });
        box.onDidAccept(() => {
            accepted = box.value ?? String(); // String() is the empty answer; this file carries no string literal
            box.hide();
        });
        box.onDidHide(() => {
            box.dispose();
            resolve(accepted);
        });
        box.show();
    });
}
