import os

def combine_src_files(src_dir, output_file):
    # Get the name of the root folder
    root_folder = os.path.basename(os.path.normpath(src_dir))

    with open(output_file, 'w', encoding='utf-8') as outfile:
        for root, dirs, files in os.walk(src_dir):
            for file in files:
                file_path = os.path.join(root, file)
                
                # Use the full path relative to src_dir, including the root folder
                relative_path = os.path.join(root_folder, os.path.relpath(file_path, src_dir))
                
                outfile.write(f"/// {relative_path}\n\n")
                
                with open(file_path, 'r', encoding='utf-8') as infile:
                    outfile.write(infile.read())
                
                outfile.write("\n\n")

# Usage
src_directory = './src'
output_file = 'combined_src_files.txt'

combine_src_files(src_directory, output_file)
print(f"Combined file created: {output_file}")