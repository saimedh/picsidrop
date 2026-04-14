import glob
import re

process_dropdown = """
        <div class="relative group">
            <button class="flex items-center gap-1 text-neutral-600 dark:text-neutral-300 group-hover:text-[#F46906] transition-colors focus:outline-none py-2">
                Process <span class="material-symbols-outlined text-[16px] transition-transform group-hover:rotate-180">expand_more</span>
            </button>
            <div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl border border-black/5 dark:border-white/10 shadow-2xl rounded-2xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <a href="sender.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#fff3ec] dark:hover:bg-[#F46906]/10 hover:text-[#F46906] text-neutral-600 dark:text-neutral-300 font-semibold transition-colors">
                    <span class="material-symbols-outlined text-[18px]">outbox</span> For Senders
                </a>
                <a href="traveler.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#fff3ec] dark:hover:bg-[#F46906]/10 hover:text-[#F46906] text-neutral-600 dark:text-neutral-300 font-semibold transition-colors">
                    <span class="material-symbols-outlined text-[18px]">directions_car</span> For Travelers
                </a>
            </div>
        </div>"""

for html_file in glob.glob("*.html"):
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if we already injected it
    if "For Senders" in content and "For Travelers" in content:
        # If it's a dropdown, skip, if it's inline in sender/traveler, we need to replace it.
        if "outbox" in content and "directions_car" in content:
            continue
            
    # Remove inline links if they exist
    inline_link_pattern = re.compile(r'<a[^>]*href="(sender|traveler)\.html"[^>]*>.*?</a>', re.DOTALL)
    content = inline_link_pattern.sub('', content)
    
    # Inject before Policies Dropdown
    # Policies dropdown usually starts with <div class="relative group"> followed by <button... > Policies
    # We will search for '<div class="relative group">\s*<button[^>]*>\s*Policies'
    
    policies_pattern = re.compile(r'(<div class="relative group">\s*<button[^>]*>\s*Policies[^<]*<span[^>]*>[^<]*</span>\s*</button>)')
    
    # Some older files like sender.html might not even have the Policies dropdown because I didn't include it in them
    if 'Policies' in content:
        new_content = policies_pattern.sub(process_dropdown + r'\n        \1', content)
        if new_content != content:
            content = new_content
    else:
        # For sender and traveler html, let's just insert before the Nav closing div
        nav_close_pattern = re.compile(r'(</div>\s*<div class="flex items-center gap-4">)')
        # Add it right before the div finishes the middle link container
        content = nav_close_pattern.sub(process_dropdown + r'\n    \1', content)
        
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(content)
print("Updated navs in all HTML files.")
