export default class Adapter {
    constructor(loader, url, t) {
        this.loader = loader;
        this.url = url;
        this.t = t;
    }

    upload() {
        return this.getCredentials().then(this.uploadImage);
    }

    abort() {
        if (this.xhr) this.xhr.abort();
    }

    getCredentials() {
        return new Promise((resolve, reject) => {
            
            var filename = this.loader.file.name;

            if (!filename) return reject('No filename found');

            var xhr = new XMLHttpRequest();
            
            xhr.withCredentials = true;
            xhr.open('GET', this.url + '?filename=' + filename, true);
            xhr.responseType = 'json';
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            xhr.addEventListener('error', reject);
            xhr.addEventListener('abort', reject);
            xhr.addEventListener('load', function () {
                var res = xhr.response;
                
                if (!res) return reject('No response from s3 creds url');

                resolve(res);
            });

            xhr.send();

        });
    }

    uploadImage(s3creds) {
        return new Promise((resolve, reject) => {
            
            var data = new FormData();

            for (var param in s3creds.params) {
                if (!s3creds.params.hasOwnProperty(param)) continue;

                data.append(param, s3creds.params[param]);
            }

            data.append('file', this.loader.file);
            
            var xhr = this.xhr = new XMLHttpRequest();
            
            xhr.withCredentials = false;
            xhr.open('POST', s3creds.endpoint_url, true);
            xhr.responseType = 'document';
            
            xhr.send(data);
            
            xhr.addEventListener('error', reject);
            xhr.addEventListener('abort', reject);
            xhr.addEventListener('load', () => {
                const res = xhr.response;

                if (!res) return reject('No Response')
    
                if (res.querySelector('Error')) {
                    return reject({
                        code: res.querySelector('Code'),
                        message: res.querySelector('Message')
                    });
                }

                var url = res.querySelector('Location');

                if (!url) {
                    return reject({
                        code: 'NoLocation',
                        message: 'No location in s3 POST response'
                    });
                }
    
                resolve({ default: url });
            });

            if (xhr.upload) {
                xhr.upload.addEventListener('progress', e => {
                    if (!e.lengthComputable) return;
                    
                    this.loader.uploadTotal = e.total;
                    this.loader.uploaded = e.loaded;
                });
            }

        });
    }
}
