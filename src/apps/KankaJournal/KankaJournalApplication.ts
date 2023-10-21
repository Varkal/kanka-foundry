import logo from '../../assets/kanka.png';
import getGame from '../../foundry/getGame';
import { getEntryFlag } from '../../foundry/journalEntries';
import localization from '../../state/localization';
import { getSetting } from '../../foundry/settings';
import syncEntities from '../../syncEntities';
import Reference from '../../types/Reference';
import { KankaApiChildEntity, KankaApiEntityType, KankaApiId } from '../../types/kanka';
import { ProgressFn } from '../../types/progress';
import template from './KankaJournalApplication.hbs';
import './KankaJournalApplication.scss';

type JournalSheetData = ReturnType<JournalSheet['getData']>;
type SheetOptions = JournalSheetOptions & Record<string, unknown>;

interface Data extends JournalSheetData {
    kankaIsGm: boolean;
    kankaEntity?: KankaApiChildEntity;
    kankaEntityType?: KankaApiEntityType;
    kankaReferences?: Record<number, Reference>;
    kankaCampaignId?: KankaApiId;
    kankaLogo: string;
    settings: {
        imageInText: boolean;
    };
    localization: Localization;
}

export default class KankaJournalApplication extends JournalSheet {
    #lastRenderOptions?: SheetOptions = undefined;

    static get defaultOptions(): SheetOptions {
        return {
            ...super.defaultOptions,
            closeOnSubmit: false,
            submitOnClose: false,
            submitOnChange: false,
            tabs: [{ navSelector: '.tabs', contentSelector: '.tab-container', initial: 'details' }],
            scrollY: ['.tab'],
            classes: ['kanka', 'kanka-journal'],
        };
    }

    get isKankaEntry(): boolean {
        return Boolean(getEntryFlag(this.object, 'snapshot'));
    }

    public getData(
        options?: Partial<SheetOptions>,
    ): Data | JournalSheetData {
        if (!this.isKankaEntry) return super.getData(options);

        return {
            ...super.getData(options),
            kankaIsGm: getGame().user?.isGM ?? false,
            kankaEntity: getEntryFlag(this.object, 'snapshot'),
            kankaEntityType: getEntryFlag(this.object, 'type'),
            kankaReferences: getEntryFlag(this.object, 'references'),
            kankaCampaignId: getEntryFlag(this.object, 'campaign'),
            kankaLogo: logo,
            settings: {
                imageInText: getSetting('imageInText'),
            },
            localization,
        };
    }

    get template(): string {
        if (!this.isKankaEntry) return super.template;

        // Only replace the default text template, not the image template
        if (super.template === 'templates/journal/sheet.html') return template;

        return super.template;
    }

    async activateListeners(html: JQuery): Promise<void> {
        super.activateListeners(html);
        if (!this.isKankaEntry) return;

        html.on('click', '[data-action]', async (event) => {
            const { action } = event.currentTarget?.dataset ?? {};

            if (!action) return;

            if (action === 'refresh') {
                const type = getEntryFlag(this.object, 'type');
                const campaign = getEntryFlag(this.object, 'campaign');
                const snapshot = getEntryFlag(this.object, 'snapshot');
                this.setLoadingState(event.currentTarget);

                if (!type || !campaign || !snapshot) throw new Error('Missing flags on journal entry');

                // eslint-disable-next-line @typescript-eslint/naming-convention
                await syncEntities(campaign, [{ child_id: snapshot.id, type }], []);
                this.rerender();
            }
        });
    }

    public rerender(): void {
        if (!this.rendered) return;
        this.render(false, this.#lastRenderOptions);
    }

    protected setLoadingState(button: HTMLButtonElement, determined = false): ProgressFn {
        const $button = $(button);
        $button.addClass('-loading');
        $(this.element).find('[data-action]').prop('disabled', true);

        if (determined) $button.addClass('-determined');
        else $button.addClass('-undetermined');

        return (current, max) => {
            $button.addClass('-determined');
            button.style.setProperty('--progress', `${Math.round((current / max) * 100)}%`);
        };
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    public _render(force?: boolean, options?: SheetOptions): Promise<void> {
        this.#lastRenderOptions = options;
        return super._render(force, options);
    }
}
