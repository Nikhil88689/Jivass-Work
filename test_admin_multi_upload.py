import requests
import sys

# Usage: python test_admin_multi_upload.py <auth_token> <user_id>

def test_admin_multi_upload(auth_token, user_id):
    url = f'http://127.0.0.1:8000/api/auth/face/admin-multi-upload/?user_id={user_id}'
    headers = {
        'Authorization': f'Token {auth_token}'
    }
    
    response = requests.get(url, headers=headers)
    
    print(f'Status Code: {response.status_code}')
    print('Response:')
    print(response.text)
    
    return response.status_code

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: python test_admin_multi_upload.py <auth_token> <user_id>')
        sys.exit(1)
        
    auth_token = sys.argv[1]
    user_id = sys.argv[2]
    
    test_admin_multi_upload(auth_token, user_id)