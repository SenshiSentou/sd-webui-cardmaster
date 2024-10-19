declare let gradioApp: any;
declare let gradio_config: any;
declare let opts: any;
declare let updateInput: (input) => void;
declare let onUiLoaded: (callback) => void;
declare let onAfterUiUpdate: (callback) => void;

interface Window {
    cardClicked: (tabname: string, textToAdd: string, allowNegativePrompt: boolean) => void,
    cardMaster: CardMaster
}

interface CardMaster {
    [key: string]: any
}

interface NetworkInfo {
    // All from network.json files
    description: string,
    "sd version": string,
    "activation text": string,
    "preferred weight": string,
    notes: string,
    // Added; tags seperated into sections
    "activation sections": string[][]
}

type GenerationType = 'txt2img' | 'img2img';
type PromptType = 'positive' | 'negative';
type ClickType = 'click' | 'doubleClick' | 'rightClick';
type InspectorType = 'docked' | 'floating' | 'compact';

(function(cm){
    class Inspector extends HTMLDivElement{
        nameField: HTMLElement;
        descriptionField: HTMLElement;
        activationTextContainer: HTMLElement;
        notesField: HTMLElement;
        currentInfo: NetworkInfo | null;
        hostCard: HTMLElement | null; // card we're attached to. Naming things is hard

        get isOpen(): boolean{
            return this.dataset.isOpen == 'true';
        }

        constructor(type: InspectorType, isOpen: boolean){
            super();
            
            this.classList.add('card-master-inspector');

            const topContainer = this.appendChild(createElementWithClassList('div', 'card-master-dim-container'));
            const metaContainer = topContainer.appendChild(createElementWithClassList('div', 'card-master-meta-container'));

            this.nameField = metaContainer.appendChild(createElementWithClassList('div', 'card-master-meta-name'));
            this.descriptionField = metaContainer.appendChild(createElementWithClassList('div', 'card-master-meta-description'));
            this.activationTextContainer = topContainer.appendChild(createElementWithClassList('div', 'card-master-tag-sections'));
            this.notesField = this.appendChild(createElementWithClassList('div', 'card-master-notes'));

            this.nameField.addEventListener('click', () => {
                toggleNetworkInTextArea(cm.promptTextAreas[getCurrentGenerationType()]['positive'], this.nameField.innerText, this.currentInfo['preferred weight']);
            });

            cm.promptTextAreas.txt2img.positive.addEventListener('change', () => this.refreshActivationTexts('txt2img'));
            cm.promptTextAreas.txt2img.negative.addEventListener('change', () => this.refreshActivationTexts('txt2img'));
            cm.promptTextAreas.img2img.positive.addEventListener('change', () => this.refreshActivationTexts('img2img'));
            cm.promptTextAreas.img2img.negative.addEventListener('change', () => this.refreshActivationTexts('img2img'));

            this.dataset.inspectorType = type;
            this.toggle(isOpen);
        }

        update(card: HTMLElement | null): void{
            activeCard = card;
            
            this.currentInfo = null;

            this.activationTextContainer.innerHTML = '';
            this.descriptionField.innerText = '';
            this.notesField.innerText = '';
    
            if(card == null){
                this.nameField.innerText = '';
                this.style.backgroundImage = '';
                return;
            }
    
            // this.nameField.innerText = card.dataset.sortName.replace(/\.[^/.]+$/, ""); // remove extension
            this.nameField.innerText = card.dataset.name;
            
            const previewImage = card.querySelector('img');
            this.style.backgroundImage = previewImage ? `url(${previewImage.src})` : '';
            
            const keyPath = getKeyPathForCard(card);
    
            if(cachedInfo.hasOwnProperty(keyPath)){ 
                this.populateNetworkInfo(card.dataset.name, cachedInfo[keyPath]);
            }

            updateNetworkInfo(keyPath, card)
            .then((info: NetworkInfo) => {
                if(info && activeCard == card){ // else we've moved on already
                    this.populateNetworkInfo(card.dataset.name, info);
                }
            })
            .catch(_ => {});
        }

        populateNetworkInfo(name: string, info: NetworkInfo): void{
            this.currentInfo = info;
            this.activationTextContainer.innerHTML = '';
            this.descriptionField.innerText = info['description'];
            this.notesField.innerText = info['notes'];
    
            const generationType: GenerationType = getCurrentGenerationType();
    
            for(const section of info['activation sections']){
                if(section.length == 0){
                    break;
                }
                
                const sectionContainer = createElementWithClassList('div', 'card-master-tag-section');
                const quickButtonContainer = createElementWithClassList('div', 'card-master-quick-button-container');
                const tagContainer = createElementWithClassList('div', 'card-master-tag-container');
    
                const quickButton = createElementWithInnerTextAndClassList('button', '');
                quickButtonContainer.appendChild(quickButton);

                quickButton.addEventListener('click', e => {
                    const addTags = tagContainer.querySelector('.card-master-tag[data-is-present="false"]') != null;

                    if(addTags){
                        const promptTextArea = cm.promptTextAreas[generationType][e.altKey ? 'negative' : 'positive'];

                        if(!promptTextArea.value.match(getLoraRegExp(name))){
                            promptTextArea.value += `,${opts.extra_networks_add_text_separator}<lora:${name}:${info['preferred weight']}>,${opts.extra_networks_add_text_separator}`;
                        }

                        promptTextArea.value += section.join(`,${opts.extra_networks_add_text_separator}`);
                        updatePromptTextArea(promptTextArea);
                    }
                    else{
                        cm.promptTextAreas[generationType]['positive'].value = removeTagsFromText(cm.promptTextAreas[generationType]['positive'].value, ...section);
                        cm.promptTextAreas[generationType]['negative'].value = removeTagsFromText(cm.promptTextAreas[generationType]['negative'].value, ...section);
                        updatePromptTextArea(cm.promptTextAreas[generationType]['positive']);
                        updatePromptTextArea(cm.promptTextAreas[generationType]['negative']);
                    }
                });
                
                for(const tag of section){
                    const reTag = getTagRegExp(tag);
                    const tagElement = tagContainer.appendChild(createElementWithInnerTextAndClassList('span', tag, 'card-master-tag'));
    
                    this.updateTagElement(tagElement, generationType);

                    function toggleTagInTextArea(promptTextArea: HTMLTextAreaElement){
                        const promptContainsTag = !!promptTextArea.value.match(reTag);
                        console.log(`prompt contains ${tag}     ${reTag}     ${promptContainsTag}`)
                        
                        if(promptContainsTag){
                            promptTextArea.value = removeTagsFromText(promptTextArea.value, tag);
                        }
                        else{
                            if(!promptTextArea.value.match(getLoraRegExp(name))){
                                promptTextArea.value += `,${opts.extra_networks_add_text_separator}<lora:${name}:${info['preferred weight']}>,${opts.extra_networks_add_text_separator}`;
                            }

                            promptTextArea.value += `,${opts.extra_networks_add_text_separator}${tag},`;
                        }
                        
                        tagElement.dataset.isPresent = (!promptContainsTag).toString();
                        updatePromptTextArea(promptTextArea);
                    }
    
                    tagElement.addEventListener('click', e => toggleTagInTextArea(cm.promptTextAreas[generationType][e.altKey ? 'negative' : 'positive']));
                    tagElement.addEventListener('contextmenu', () => toggleTagInTextArea(cm.promptTextAreas[generationType]['negative']));
                }
                
                sectionContainer.appendChild(quickButtonContainer);
                sectionContainer.appendChild(tagContainer);
                
                this.activationTextContainer.appendChild(sectionContainer);
            }
        }

        updateNameElement(generationType: GenerationType){
            this.updateIsPresentAttribute(this.nameField, generationType, getLoraRegExp(this.nameField.innerText)); //getLoraRegExp(card.data.name)
        }

        updateTagElement(tagElement: HTMLElement, generationType: GenerationType){
            this.updateIsPresentAttribute(tagElement, generationType, getTagRegExp(tagElement.innerText));
        }

        updateIsPresentAttribute(element: HTMLElement, generationType: GenerationType, regExp:RegExp){
            element.dataset.isPresent = (!!(cm.promptTextAreas[generationType]['positive'].value.match(regExp) || cm.promptTextAreas[generationType]['negative'].value.match(regExp))).toString();
        }

        refreshActivationTexts(generationType: GenerationType): void{
            if(!this.isOpen){
                return;
            }

            this.updateNameElement(generationType);

            const tagElements = this.querySelectorAll('.card-master-tag');

            for(const tagElement of tagElements){
                this.updateTagElement(<HTMLElement>tagElement, generationType);
            }
        }
    
        toggle(open: boolean): void{
            this.dataset.isOpen = open.toString();

            if(!open){
                this.hostCard = null;
            }
        }

        attach(card: HTMLElement): void{
            this.hostCard = card;

            card.parentElement.appendChild(this);

            const cardRect = card.getBoundingClientRect();
            const parentRect = card.parentElement.getBoundingClientRect();

            this.style.left = `${cardRect.left - parentRect.left + cardRect.width * .5}px`;
            this.style.top = `${cardRect.top - parentRect.top + cardRect.height * .5}px`;

            this.toggle(true);
            this.update(card);

            const rect = this.getBoundingClientRect();

            if(rect.x < 0){
                this.style.left = `${cardRect.left - parentRect.left + cardRect.width * .5 - rect.x}px`;
            }
            else if(rect.x + rect.width > screen.width){
                this.style.left = `${cardRect.left - parentRect.left + cardRect.width * .5 - (rect.x + rect.width - screen.width)}px`;
            }
        }
    }
    
    customElements.define('cardmaster-inspector', Inspector, { extends: 'div' });

    const app = gradioApp();
    const wait = (n) => new Promise((resolve) => setTimeout(resolve, n));

    let activeCard: HTMLElement | null = null; // current hover
    
    const api = {
        get: (endpoint: string): Promise<any> => {
            return fetch(`${gradio_config.root}/cardmaster/${endpoint}`, {cache: 'no-store'}).then(response => {
                if(response.ok){
                    return response.json();
                } else{
                    return Promise.reject(response);
                }
            });
        },
    };
    
    const cachedInfo: {[loraPath: string]: NetworkInfo} = {};
    let floatingInspector: Inspector;
    let compactInspector: Inspector;

    async function injectUI(): Promise<void>{
        while(opts.cardmaster_card_activation_text_count == undefined){ // wait for opts to load
            await wait(200);
        }

        let extensionsDiv = app.querySelector('#extensions');

        while(extensionsDiv == undefined){
            await wait(200);
            extensionsDiv = app.querySelector('#extensions');
        }

        const extensionCheckboxes = Array(...extensionsDiv.querySelectorAll('input[type="checkbox"]'));
        const cardMasterCheckbox = extensionCheckboxes.find(c => c.name == 'enable_sd-webui-cardmaster');
        const tinyCardsCheckbox = extensionCheckboxes.find(c => c.name == 'enable_sd-webui-tinycards');
        
        if(cardMasterCheckbox && tinyCardsCheckbox && tinyCardsCheckbox.checked){
            const modalContainer = createElementWithClassList('div', 'card-master-modal-container');
            const modal = createElementWithInnerTextAndClassList('div', "Card Master replaces the old \"Tinycards\" extension. Please go to the extensions tab and remove or disable the Tinycards extension for the best experience.", 'card-master-modal');
            
            function closeModal(){
                modalContainer.style.display = 'none';
            }
            
            modalContainer.appendChild(modal);
            modal.appendChild(createElementWithInnerTextAndClassList('button', "Got it!")).addEventListener('click', closeModal);
            
            app.querySelector('.contain').appendChild(modalContainer);
            modalContainer.addEventListener('click', closeModal);
        }

        if(opts.cardmaster_card_activation_text_count.indexOf('📄➕📑') == 0){ // emojies are 2 chars long, so we can't just check [0]
            document.body.dataset.cardmasterCardHint = 'full'; // I wanted to apply these to app.dataset instead, but somehow that errors out as null?
        }
        else if(opts.cardmaster_card_activation_text_count.indexOf('📄') == 0){
            document.body.dataset.cardmasterCardHint = 'tags';
        }
        else if(opts.cardmaster_card_activation_text_count.indexOf('📑') == 0){
            document.body.dataset.cardmasterCardHint = 'sections';
        }
        else{
            document.body.dataset.cardmasterCardHint = 'none';
        }

        document.documentElement.style.setProperty('--card-master-activation-hint-primary-color', opts.cardmaster_card_activation_hint_primary_color);
        document.documentElement.style.setProperty('--card-master-activation-hint-secondary-color', opts.cardmaster_card_activation_hint_secondary_color);

        cm.promptTextAreas = {
            'txt2img': {
                'positive': app.querySelector("#txt2img_prompt > label > textarea"),
                'negative': app.querySelector("#txt2img_neg_prompt > label > textarea")
            },
            'img2img': {
                'positive': app.querySelector("#img2img_prompt > label > textarea"),
                'negative': app.querySelector("#img2img_neg_prompt > label > textarea")
            }
        };

        floatingInspector = new Inspector('floating', false);
        compactInspector = new Inspector('compact', false);

        const cardBecameVisibileObserver = new IntersectionObserver((entries) => {
            for(const entry of entries){
                if(entry.intersectionRatio > 0){
                    const card = <HTMLElement>entry.target;
                    const keyPath = getKeyPathForCard(card);

                    updateNetworkInfo(keyPath, card)
                    .catch(_ => {});
                }
            }
          }, {root: null, rootMargin: '0px'});

        const extraNetworkContainers = app.querySelectorAll('.extra-networks');

        for(const networkContainer of extraNetworkContainers){
            const sliderContainer = createElementWithClassList('span', 'card-master-extra-ui');
            const slider:HTMLInputElement = document.createElement("input");
            
            sliderContainer.classList.add('tczoomslider');
            
            slider.id = `${networkContainer.id}-card-master-slider`;
            slider.type = 'range';
            slider.min = ".2";
            slider.max = "1";
            slider.step = ".01";
            slider.value = localStorage.getItem('cardMasterZoom') || localStorage.getItem('tczoom') || ".4";
            
            slider.oninput = () => {
                document.documentElement.style.setProperty('--card-master-zoom', slider.value);
                
                localStorage.setItem('cardMasterZoom', slider.value);
            };
                    
            sliderContainer.appendChild(slider);
            
            const navTab = networkContainer.querySelector('.tab-nav');
            navTab.appendChild(sliderContainer);

            const detailViewButton = createElementWithClassList('button', 'card-master-extra-ui', ...document.getElementById('txt2img_extra_refresh').classList);
            detailViewButton.classList.remove('hidden');
            detailViewButton.id = `txt2img_extra_card-master-detail-view-toggle`;

            navTab.appendChild(detailViewButton);

            const inspector = new Inspector('docked', !!opts.cardmaster_open_detail_view_on_load);

            detailViewButton.addEventListener('click', () => {
                inspector.toggle(!inspector.isOpen);

                if(!inspector.isOpen){
                    const selectedCard = inspector.parentNode.querySelector('.extra-network-cards .card.card-master-selected');
    
                    if(selectedCard){
                        selectedCard.classList.remove('card-master-selected');
                    }
                }
            });
            
            // inner html gets reset once extra networks get added
            let cardContainers = networkContainer.querySelectorAll('.extra-network-cards');
            
            // wait for cards to load
            while(cardContainers.length == 0){
                await wait(500);
                cardContainers = networkContainer.querySelectorAll('.extra-network-cards');
            }

            const cards: HTMLElement[] = networkContainer.querySelectorAll('.card');
            for(const card of cards){
                cardBecameVisibileObserver.observe(card);
            }

            networkContainer.appendChild(inspector);

            networkContainer.addEventListener('mouseover', e => {
                const card = e.target.closest('.card');

                if(card && card != activeCard){
                    inspector.update(card);

                    card.addEventListener('mouseout', () => {
                        if(activeCard == card){
                            activeCard = null;
                            inspector.update(networkContainer.querySelector('.card-master-selected'));
                        }
                    }, {once: true});

                    e.stopPropagation();
                }
            });

            function handleClick(e: MouseEvent, clickType: ClickType){
                const card: HTMLElement | null = (<HTMLElement>e.target).closest('.card');

                if(card){
                    onCardClicked(card, inspector, clickType, e.altKey);
                    e.stopPropagation();
                    e.preventDefault();
                }
            }

            networkContainer.addEventListener('click', e => handleClick(e, 'click'));
            networkContainer.addEventListener('dblclick', e => handleClick(e, 'doubleClick'));
            networkContainer.addEventListener('contextmenu', e => handleClick(e, 'rightClick'));
        }

        // Hijack this, we do our own thing now
        window.cardClicked = function(_tabname: string, _textToAdd: string, _allowNegativePrompt: boolean): void {}
    }

    function updateNetworkInfo(keyPath:string, card: HTMLElement | null): Promise<void | NetworkInfo>{
        return api.get(`networkinfo?network_folder=${btoa(encodeURIComponent(card.dataset.sortPath))}&network_name=${btoa(encodeURIComponent(card.dataset.sortName))}`)
        .then((info: NetworkInfo) => {
            const tags = getTagsFromText(info['activation text']);
            let activationTextSections: string[][] = [];

            if(info['activation text'].length > 0){
                let activationTexts = info['activation text'].split(/(?:,,|;)\s*/); // Try to split by ,, or ;

                if(activationTexts.length > 1){
                    activationTextSections = activationTexts.map(getTagsFromText);
                }
                else if(activationTexts.length == 1){ // No sections specified, some authors use the first tag as separator by repeating it
                    let currentSection = 0;
                    
                    activationTextSections.push([tags[0]]);

                    for(let i = 1 ; i < tags.length; i++){
                        if(tags[i] == tags[0]){
                            currentSection++;
                            activationTextSections.push([]);
                        }

                        activationTextSections[currentSection].push(tags[i]);
                    }
                }
            }

            info['activation sections'] = activationTextSections;

            cachedInfo[keyPath] = info;
            
            if(card){
                switch(document.body.dataset.cardmasterCardHint){
                    case 'tags':        card.dataset.cardmasterNumActivationTexts = activationTextSections.length.toString(); break;
                    case 'sections':    card.dataset.cardmasterNumActivationTexts = tags.length.toString(); break;
                    case 'full':        card.dataset.cardmasterNumActivationTexts = `${tags.length} (${activationTextSections.length})`; break;
                }
            }

            return info;
        })
        .catch(e => logResponseWarning(`There was an error fetching the network info for ${encodeURIComponent(card.dataset.sortPath)}`, e));
    }

    function getKeyPathForCard(card: HTMLElement): string{
        return `${card.dataset.sortPath}/${card.dataset.sortName}`; // can safely use / as path sep, since it's not used as a real path, just as a key
    }

    function getCachedInfoForCard(card: HTMLElement): NetworkInfo | null{
        const keyPath = getKeyPathForCard(card);
    
        return cachedInfo.hasOwnProperty(keyPath) ? cachedInfo[keyPath] : null;
    }

    function getLoraRegExp(networkName: string): RegExp{
        return new RegExp(`<lora:${networkName}:[\\d.]+>\\s*,*\\s*`)
    }

    function getTagRegExp(tag: string): RegExp{
        const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        return new RegExp(`(?<=(^|[,([:])\\s*)(?<![\\w\\d_\\-:])${escapedTag}(?![\\w\\d_\\-: ])`, 'i');
    }

    function isLoraOrTICard(card: HTMLElement): boolean{
        const enc = card.closest('.extra-network-cards');

        return enc && enc.id.match(/(?:txt|img)2img_(?:lora_cards|textual_inversion_cards)/i) != null;
    }

    function onCardClicked(card: HTMLElement, inspector: Inspector, clickType: ClickType, withAlt: boolean): void{
        const info = getCachedInfoForCard(card);
        const settingName = `cardmaster_${clickType.replace(/[A-Z]/g, s => '_' + s.toLowerCase())}_detail_view_${inspector.isOpen ? 'open' : 'closed'}_${info['activation sections'].length > 1 ? 'multiple' : 'single'}`;
        
        switch([...opts[settingName]][0]){ // some symbols are 2 chars long
            case '📎':
                if(isLoraOrTICard(card)){
                    if(info['activation sections'].length > 0){
                        toggleNetworkInTextArea(cm.promptTextAreas[getCurrentGenerationType()][withAlt ? 'negative' : 'positive'], card.dataset.name, info['preferred weight'], ...info['activation sections'][0]);
                    }
                    else{
                        toggleNetworkInTextArea(cm.promptTextAreas[getCurrentGenerationType()][withAlt ? 'negative' : 'positive'], card.dataset.name, info['preferred weight']);
                    }
                }
                break;
            case '🖇':
                if(isLoraOrTICard(card)){
                    toggleNetworkInTextArea(cm.promptTextAreas[getCurrentGenerationType()][withAlt ? 'negative' : 'positive'], card.dataset.name, info['preferred weight'], ...info['activation sections'].flat());
                }
                break;
            case '📌':
                if(!inspector.isOpen){
                    inspector.toggle(true);
                }

                const cardContainer = card.parentElement;
                const selectedCard = cardContainer.querySelector('.card.card-master-selected');

                if(selectedCard){
                    selectedCard.classList.remove('card-master-selected');
                }
                
                if(card != selectedCard){
                    card.classList.add('card-master-selected');
                }

                inspector.update(card);
                break;
            case '🖼':
                if(floatingInspector.isOpen){
                    floatingInspector.toggle(false);
                }
                else{
                    floatingInspector.attach(card);

                    let floatingInspectorCloseAbortController = new AbortController();

                    function closeFloatingInspector(){
                        floatingInspector.toggle(false);
                        floatingInspectorCloseAbortController.abort();
                    }

                    floatingInspector.addEventListener('mouseleave', closeFloatingInspector, {signal: floatingInspectorCloseAbortController.signal});
                    floatingInspector.addEventListener('contextmenu', closeFloatingInspector, {signal: floatingInspectorCloseAbortController.signal});
                }
                break;
            case '🗂':
                if(compactInspector.isOpen && card == compactInspector.hostCard){
                    compactInspector.toggle(false);
                }
                else{
                    compactInspector.attach(card);
                    document.removeEventListener('mousemove', watchForCompactInspectorCloseGesture); // Make sure it doesn't get added twice, when adjacent card is attached to e.g.
                    document.addEventListener('mousemove', watchForCompactInspectorCloseGesture);
                }
                break;
            default: break;
        }
    }

    function watchForCompactInspectorCloseGesture(e: MouseEvent): void{ // close it when mouse exists the bounding box of card.bounds | inspector.bounds
        const cardRect = compactInspector.hostCard.getBoundingClientRect();
        const inspectorRect = compactInspector.getBoundingClientRect();

        const boundsLeft = Math.min(cardRect.left, inspectorRect.left);
        const boundsRight = Math.max(cardRect.right, inspectorRect.right);
        const boundsTop = Math.min(cardRect.top, inspectorRect.top);
        const boundsBottom = Math.max(cardRect.bottom, inspectorRect.bottom);

        const bounds = new DOMRect(
            boundsLeft,
            boundsTop,
            boundsRight - boundsLeft,
            boundsBottom - boundsTop
        );

        if(e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom){
            compactInspector.toggle(false);
            document.removeEventListener('mousemove', watchForCompactInspectorCloseGesture);
        }
    }

    function getCurrentGenerationType(): GenerationType{
        return app.getElementById("tab_txt2img").style.display == 'block' ? 'txt2img': 'img2img';
    }

    function toggleNetworkInTextArea(textArea: HTMLTextAreaElement, networkName: string, defaultWeight: string, ...tags: string[]): void{
        const networkMatch = textArea.value.match(getLoraRegExp(networkName)); // todo: TI
        
        if(networkMatch?.length > 0){ // remove instead
            textArea.value = textArea.value.replace(networkMatch[0], '');

            if(tags.length > 0){
                textArea.value = removeTagsFromText(textArea.value, ...tags);
            }
        }
        else{
            textArea.value += `,${opts.extra_networks_add_text_separator}<lora:${networkName}:${defaultWeight}>`;

            for(const tag of tags){
                if(!textArea.value.match(getTagRegExp(tag))){
                    // textArea.value += ',' + opts.extra_networks_add_text_separator + tag;
                    textArea.value += `,${opts.extra_networks_add_text_separator}${tag},`; // Double commas ensure correct behaviour when adding tags fast; they get filtered later anyway
                }
            }
        }

        updatePromptTextArea(textArea);
    }

    function removeTagsFromText(text: string, ...tags: string[]): string{ // I found the default implementation a bit lacking, so it's regex time!
        const reTagWithTrailings = new RegExp(`((?<=(^|[,([:])\\s*)(?<![\\w\\d])(${tags.join('|')})(?![\\w\\d_\\-: ])\\s*,?\\s*)`, 'gi'); // negative lookxxxs, to prevent 'hat' from matching 'HATs', 'highHAT', 'red hat', or <lora:hat:1>. Then include any trailing commas and spaces

        return text.replaceAll(reTagWithTrailings, ''); // first, remove all valid instances of the tag, along with associated ',' and \s
    }

    function getTagsFromText(text: string): string[]{
        return text.split(/(?<!\(),\s*(?![^(]*\))/).filter(t => t.length > 0 && /\S/.test(t)); // split by , not in () then remove empty or all-whitespace tags        
    }

    function updatePromptTextArea(textArea: HTMLTextAreaElement){
        textArea.value = textArea.value.replaceAll(/ *,+ */g, `,${opts.extra_networks_add_text_separator}`) // first, combine all whitespace and multiple commas into one
        .replaceAll(/[([][:\d\s.()]*[)\]]\s*,?\s*/gi, '') // next, do a pass to clean up any () or [::] groups that are now empty. Matches any such groups that only contain other parentheses, ':', '.', and \d
        .replaceAll(/ *,+ */g, `,${opts.extra_networks_add_text_separator}`) // then combine all consecutive spaces and commas into one single separator
        .replace(/\s*,?\s*$/gi, ''); // and finally, remove any left-over commas and whitespaces at the end of the text. EZ-PZ!

        updateInput(textArea);

        const e = new Event("change", {bubbles: true});
        Object.defineProperty(e, "target", {value: textArea});
        textArea.dispatchEvent(e);
    }

    function createElementWithClassList(tagName: string, ...classes: string[]): HTMLElement{
        const element = document.createElement(tagName);
    
        for(const className of classes) {
            element.classList.add(className);
        }
    
        return element;
    }

    function createElementWithInnerTextAndClassList(tagName: string, innerText: string, ...classes: string[]): HTMLElement{
        const element = createElementWithClassList(tagName, ...classes);

        element.innerText = innerText;
    
        return element;
    }
    
    async function logResponseWarning(baseMessage: string, e: any): Promise<void>{
        let err = "[No error received]";
        let errType = "unknown type";
        
        if(typeof e == 'string'){
            errType = "string";
            err = e;
        }
        else if(e instanceof Response){
            errType = "Response object";
            err = await e.text();
        }
        else {
            err = e;
        }

        console.warn(`[Card Master] ${baseMessage}: (${errType} error) ${err}`);
    }

    onUiLoaded(injectUI);
// })();
})(window.cardMaster = window.cardMaster || {});