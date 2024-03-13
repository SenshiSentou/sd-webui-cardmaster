import os
import base64
from pathlib import Path

import gradio as gr
import modules.script_callbacks as script_callbacks
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from modules import shared, ui_components

def card_master_api(blocks: gr.Blocks, app: FastAPI):
    @app.get("/cardmaster/networkinfo/")
    async def get_network_info(network_folder: str, network_name: str):
        network_path = Path(os.path.join(base64.b64decode(network_folder).decode("ascii"), base64.b64decode(network_name).decode("ascii")))

        if network_path is None or (not network_path.exists()):
            return JSONResponse({"error": "The specified network does not exist"}, status_code=404)
        
        json_path = Path(os.path.splitext(network_path)[0] + ".json")

        if not json_path.exists():
            return JSONResponse({"error": "The specified network does have an associated .json file"}, status_code=404)

        return FileResponse(json_path)

def on_ui_settings():
    action_args = {"choices": ['Do nothing', '📎 Apply first activation text', '🖇 Apply all activation texts', '📌 Pin card to main detail view', '🖼 Open floating detail view', '🗂 Open compact activation text selector']}
    # alt icons: 📎 🖇   📘 📖    📕 📗    📊 🖼 
    activation_text_count_args = {"choices": ['Nothing', '📄 Number of activation texts', '📑 Number of activation text sections', '📄➕📑 Number of activation texts and sections']}
    # alt icons: 📁 🏷 🔖 🍣 🍱 🎚 🎛 🎟 🎫 🎞 🏠 🏡 🏘

    options = {
        "cardmaster_open_detail_view_on_load": shared.OptionInfo(False, "Start UI with docked detail view open").needs_reload_ui(),
        "cardmaster_card_activation_text_count": shared.OptionInfo(activation_text_count_args['choices'][3], "Activation text hint on LoRA cards", gr.Dropdown, activation_text_count_args).needs_reload_ui(),
        "cardmaster_card_activation_hint_primary_color": shared.OptionInfo("#FFFFFF", "Background color for cards' activation text hint", ui_components.FormColorPicker, {}).needs_reload_ui(),
        "cardmaster_card_activation_hint_secondary_color": shared.OptionInfo("#f9af3c", "Accent color for cards' activation text hint", ui_components.FormColorPicker, {}).needs_reload_ui(),
        "cardmaster_explanation": shared.OptionHTML("""
    The "main detail view" the below options refer to is the view you can toggle using the button present on every "extra networks" tab. If "Pin card to main detail view" is selected and this view is not open, it will be automatically opened.<br />
    A "floating detail view" looks identical to the former, but will appear in-place, and close itself when the cursor leaves it or its card.<br />
    The "compact activation text selector" is a more condensed, less intrusive alternative.
    """),
        "cardmaster_header_spacer_1": shared.OptionHTML(""),
        "cardmaster_header_detail_view_open": shared.OptionHTML("Main detail view open"),
        "cardmaster_header_detail_view_closed": shared.OptionHTML("Main detail view closed"),
        "cardmaster_header_spacer_2": shared.OptionHTML(""),
        "cardmaster_header_one_activation_text_1": shared.OptionHTML("One activation text"),
        "cardmaster_header_multiple_activation_texts_1": shared.OptionHTML("Two+ activation texts"),
        "cardmaster_header_one_activation_text_2": shared.OptionHTML("One activation text"),
        "cardmaster_header_multiple_activation_texts_2": shared.OptionHTML("Two+ activation texts"),
        "cardmaster_header_click": shared.OptionHTML("Click:"),
        "cardmaster_click_detail_view_open_single": shared.OptionInfo(action_args['choices'][3], "", gr.Dropdown, action_args),
        "cardmaster_click_detail_view_open_multiple": shared.OptionInfo(action_args['choices'][3], "", gr.Dropdown, action_args),
        "cardmaster_click_detail_view_closed_single": shared.OptionInfo(action_args['choices'][1], "", gr.Dropdown, action_args),
        "cardmaster_click_detail_view_closed_multiple": shared.OptionInfo(action_args['choices'][2], "", gr.Dropdown, action_args),
        "cardmaster_header_double_click": shared.OptionHTML("Double click:"),
        "cardmaster_double_click_detail_view_open_single": shared.OptionInfo(action_args['choices'][1], "", gr.Dropdown, action_args),
        "cardmaster_double_click_detail_view_open_multiple": shared.OptionInfo(action_args['choices'][2], "", gr.Dropdown, action_args),
        "cardmaster_double_click_detail_view_closed_single": shared.OptionInfo(action_args['choices'][1], "", gr.Dropdown, action_args),
        "cardmaster_double_click_detail_view_closed_multiple": shared.OptionInfo(action_args['choices'][2], "", gr.Dropdown, action_args),
        "cardmaster_header_right_click": shared.OptionHTML("Right click:"),
        "cardmaster_right_click_detail_view_open_single": shared.OptionInfo(action_args['choices'][5], "", gr.Dropdown, action_args),
        "cardmaster_right_click_detail_view_open_multiple": shared.OptionInfo(action_args['choices'][5], "", gr.Dropdown, action_args),
        "cardmaster_right_click_detail_view_closed_single": shared.OptionInfo(action_args['choices'][4], "", gr.Dropdown, action_args),
        "cardmaster_right_click_detail_view_closed_multiple": shared.OptionInfo(action_args['choices'][4], "", gr.Dropdown, action_args)
    }

    for name, opt in options.items():
        opt.section = ('cardmaster', "Card Master")
        shared.opts.add_option(name, opt)

script_callbacks.on_app_started(card_master_api)
script_callbacks.on_ui_settings(on_ui_settings)