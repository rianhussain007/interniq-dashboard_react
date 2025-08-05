import streamlit as st
import os

def render_modern_navigation():
    """
    Renders the modern navigation bar by reading the content from modern_nav.html.

    This component is designed to be embedded in a Streamlit app. It communicates
    page navigation back to Streamlit via `window.parent.postMessage`.

    Returns:
        str: The page selected by the user in the navigation bar, or None if no selection.
    """
    try:
        # Construct the absolute path to modern_nav.html relative to this script
        # __file__ is components/navigation.py, so we go up one level to the project root
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        html_file_path = os.path.join(project_root, 'modern_nav.html')

        if not os.path.exists(html_file_path):
            st.error(f"Error: `modern_nav.html` not found at {html_file_path}. Please ensure it is in the project root directory.")
            return None

        with open(html_file_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # The component sends back a dictionary-like object upon a navigation event.
        # We remove the 'key' argument for compatibility with older Streamlit versions.
        component_value = st.components.v1.html(
            html_content,
            height=70 # Adjusted height to prevent scrollbars
        )
        
        # When a navigation event occurs, the component sends back a dictionary.
        # We then update the session state directly to trigger a page change.
        if component_value and isinstance(component_value, dict):
            selected_page = component_value.get('page')
            if selected_page and selected_page != st.session_state.get('page'):
                st.session_state.page = selected_page
                st.rerun() # Force an immediate rerun to reflect the page change

    except Exception as e:
        st.error(f"An error occurred while rendering the navigation component: {e}")

