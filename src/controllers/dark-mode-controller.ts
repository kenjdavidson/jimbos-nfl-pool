import { Controller } from '@hotwired/stimulus';

const DARK_MODE_KEY = 'dark_mode';
const DARK_MODE_OPT = ['dark', 'light'];

export default class DarkModeController extends Controller<HTMLElement> {    
    declare readonly hasToggleTarget: boolean;
    declare readonly toggleTarget: HTMLInputElement;
    declare readonly toggleTargets: HTMLInputElement[];

    prefersDark: boolean;

    initialize() {
        this.prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        console.debug(`User ${this.prefersDark ? 'prefers' : 'does not prefer'} dark mode.`);

        const savedMode = localStorage.getItem(DARK_MODE_KEY) || this.prefersDark ? DARK_MODE_OPT[0] : DARK_MODE_OPT[1];
        console.debug(`Currently saved setting is ${savedMode}`);
    }

    toggleDarkMode() {

    }
}