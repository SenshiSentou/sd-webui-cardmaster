onUiLoaded(injectTinyCardsUI);
onAfterUiUpdate(updateTinyCardsUI);

function injectTinyCardsUI() {
    const app = gradioApp();

    const navTabs = ['txt2img', 'img2img'];
    const extraTabs = ['textual_inversion', 'hypernetworks', 'checkpoints', 'lora'];
    
    for (const nt of navTabs) {
        const sliderContainer = document.createElement("span");
        const slider = document.createElement("input");

        sliderContainer.classList.add('tczoomslider');

        slider.id = `${nt}_tcslider`;
        slider.type = 'range';
        slider.min = .2;
        slider.max = 1;
        slider.step = .01;
        slider.value = localStorage.getItem('tczoom') || .3;

        slider.oninput = () => {
            for (const nt of navTabs) {
                for (const et of extraTabs) {
                    const container = app.querySelector(`#${nt}_${et}_cards`);

                    if(container){
                        container.style.setProperty('--zoom', slider.value);
                    }
                }
            }

            localStorage.setItem('tczoom', slider.value);
        }

        sliderContainer.appendChild(slider);
        app.querySelector(`#${nt}_extra_tabs .tab-nav`).appendChild(sliderContainer);

        sliderContainer.style.display = 'none';
    }
}

function updateTinyCardsUI(){
    const app = gradioApp();

    const activeNavTab = get_uiCurrentTab();

    if(!activeNavTab){
        return;
    }
    
    const activeExtraTab = app.querySelector(`#${activeNavTab.innerText}_extra_tabs .tab-nav button.selected`);

    if(!activeExtraTab){
        return;
    }

    const activeExtraTabIndex = Array.prototype.slice.call(activeExtraTab.parentNode.children ).indexOf(activeExtraTab);
    const sliderDisplay = (activeExtraTab.innerText != "Generation" && activeExtraTabIndex > 0) ? 'block' : 'none'; // This looks over-engineered, but people translate and customize the hell out of their UIs

    for (const slider of app.querySelectorAll('.tczoomslider')) {
        slider.style.display = sliderDisplay;
    }

    if(sliderDisplay == 'block'){
        app.querySelector('.tczoomslider input').dispatchEvent(new Event('input', { bubbles: true })); // Update card size on tab enter
    }
}