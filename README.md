# WebMap Application Setup Guide

## Prerequisites
- Visual Studio Code
- Python 3.x installed on your system
- SSH access to the server instance
- Git (for version control)

## Setting up VS Code Remote SSH

1. Install the "Remote - SSH" extension in VS Code:
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X or Cmd+Shift+X)
   - Search for "Remote - SSH"
   - Install the extension by Microsoft

2. Configure SSH connection:
   - Open VS Code Command Palette (Ctrl+Shift+P or Cmd+Shift+P)
   - Type "Remote-SSH: Connect to Host..."
   - Click "Add New SSH Host..."
   - Enter your SSH connection string: `ssh username@<instance-ipv4-address>`
   - Select your SSH config file to update

3. Connect to the remote server:
   - Click on the green button in the bottom-left corner of VS Code
   - Select "Connect to Host..."
   - Choose your configured SSH host
   - VS Code will establish the connection
   - Once connected, click "Open Folder" and navigate to the webmap directory

## Setting up the Environment

1. Activate the virtual environment:
```bash
source venv/bin/activate
```

2. Install required dependencies:
```bash
pip install -r requirements.txt
```

## Checking and Managing Services

1. Check Nginx status:
```bash
sudo systemctl status nginx
```

2. If Nginx is not running, start it:
```bash
sudo systemctl start nginx
```

3. Check WebMap application status:
```bash
sudo systemctl status webmap
```

4. If WebMap is not running, start it:
```bash
sudo systemctl start webmap
```

5. To restart either service:
```bash
sudo systemctl restart nginx
# OR
sudo systemctl restart webmap
```
6. To start the application:
```bash
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```
## Accessing the Application

1. Get the instance's IPv4 address:
```bash
curl http://169.254.169.254/latest/meta-data/public-ipv4
# OR
ip addr show
```

2. Access the application:
   - Open your web browser
   - Navigate to `http://<instance-ipv4-address>`

## Creating New Country Coffee Compass Map

1. Open `config.js` in the webmap directory
2. Add or modify the country configuration:
```javascript
// Example of adding a new country
CURRENT_COUNTRY: 'Kenya', // Change this to 'Vietnam' to switch countries
```

## Project Structure
- `app.py`: Main Flask application file
- `map.js`: Main mapping functionality
- `styles.css`: Styling for the application
- `index.html`: Main HTML template
- `config.js`: Configuration settings for countries and map parameters

## Troubleshooting

1. If you can't connect via SSH:
   - Verify your SSH credentials
   - Check if the instance's IPv4 address is correct
   - Ensure your SSH key is properly configured
   - Check security group settings allow SSH access

2. If services are not starting:
   - Check logs with:
     ```bash
     sudo journalctl -u nginx
     sudo journalctl -u webmap
     ```
   - Verify port availability:
     ```bash
     sudo netstat -tulpn | grep LISTEN
     ```

3. If the application is not accessible:
   - Verify the instance's security group allows HTTP traffic (port 80)
   - Check if both Nginx and WebMap services are running
   - Verify the correct IPv4 address is being used

## Additional Notes

- Keep your virtual environment activated while working on the project
- The application uses OpenLayers for map rendering
- GeoServer should be properly configured for tile serving
- Regular monitoring of services is recommended:
  ```bash
  sudo systemctl status nginx webmap
  ```
- For log monitoring in real-time:
  ```bash
  sudo tail -f /var/log/nginx/error.log
  ``` 