<img src="https://github.com/SenshiSentou/sd-webui-tinycards/blob/mastercard-beta/toma-chan.png" width="300">

# Card Master

Card Master adds a host of easability and quality of life features to the cards found in the "Extra Networks" tabs (TIs, Hypernetworks, Checkpoints, and, most notably, LoRAs).

## Card zoom

The first thing you might notice is a zoom slider added to the extra tabs header. This makes browsing large collections of checkpoints and LoRAs much faster. The card will grow on hover, so you won't miss any information.

![](https://github.com/SenshiSentou/sd-webui-tinycards/blob/mastercard-beta/preview.gif)

## Docked detail view

Right next to the zoom slider is a button that will toggle a side panel called the "docked detail view" (this is referred to as an `inspector` in code). This detail view will show more granular information about a card.

<img src="https://github.com/SenshiSentou/sd-webui-tinycards/blob/mastercard-beta/docked-detail-view.png" width="300">

- The circle in front of the card name indicates whether the `<lora:name:weight>` tag is present in the prompt text. Clicking on the name will add or remove this tag.
- A lot or LoRAs come with several different activation text "sections" (see below for more information on this). Each tag shows whether or not it's present or not (green background = present) in either the positive *or* negative prompt. Clicking a tag will add or remove it from the positive prompt. Right-clicking or holding `alt` while clicking it will do the same for the negative prompt instead. The "quick button" (`[+]` or `[-]`) in front will perform the action for all tags in that section at once. Tags are never added more than once, so don't be afraid to use this even if some of the section's tags are already present.
- Notes are shown at the bottom left.

By default, clicking on a card will apply all activation texts if there are any left to add, or remove them all if all were already present. Right-clicking will pin the card to the detail view so you can interact with it.

However, both click, double click, and right click actions are fully customizable from the settings page.

![](https://github.com/SenshiSentou/sd-webui-tinycards/blob/mastercard-beta/settings.png)

## Other detail views

If you don't like having a full detail view taking up space all the time, you might prefer to bind one of your card click actions to open either the **floating detail view** or **compact detail view** instead. The floating detail view looks identical to the docked one, opening up on top of the card you clicked, and closing when you mouse our of it. The compact detail view omits all information except for the tags and functions the same way.

<img src="https://github.com/SenshiSentou/sd-webui-tinycards/blob/mastercard-beta/compact-detail-view.png" width="450">

*The compact detail view*

## Activation text sections

A lot or LoRAs come with several different activation text "sections" – usually to offer things like outfit variations and the like. As you can see above, Card Master makes extensive use of these. Most authors follow civit.ai's convention, which is to separate sections with a double comma (`,,`). Card Master accepts this, as well as a semicolon (`;`) as an explicit separator.

In addition, Card Master will split the activation text out into separate sections if the first tag is ever repeated. For example, `tomachan, long hair, outfit1, tomachan, ponytail, outfit2` will be split into `tomachan, long hair, outfit1` and `tomachan, ponytail, outfit2`.

## Behaviours to be aware of

There are a couple things Card Master is opinionated about, causing it to deviate from the default A1111 behaviour:

1. When adding activation texts, only those that are not already present in the prompt will be added; duplicate texts will never be added.
2. When clicking a card, if all activation texts are already present, both the `<lora:name:weight>` *and all of its associated tags* will be removed from the prompts.

In addition, when adding an activation text from a detail view, if that card's `<lora:name:weight>` text is not already present in the prompt, it will automatically be added.

# Installation

Since this is a separate branch you will need to manually downloadad and add this extension. Click the green `<> Code` button above, then choose `Download ZIP`. Extract the archive and place the folder in your A1111 installation's `extensions` folder.

If you already had Tinycards installed, please remove or disable that first.
