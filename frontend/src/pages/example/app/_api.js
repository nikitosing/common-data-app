import {writable, get} from 'svelte/store'

const apiUrl = 'http://127.0.0.1:8000/'
export let user = writable("")


export async function sendForm(login, username, password) {
    let json_response = await fetch(
        apiUrl + (login ? 'users/token' : 'users/new'),
        {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `username=${username}&password=${password}`
        },
    ).then(res => res.json());
    if (json_response.detail) {
        return login ? "Неправильная почта или пароль" : "Такая почта уже используется"
    }
    let {access_token, token_type} = json_response;
    user.set(access_token);
    setCookie('access_token', access_token, {samesite: 'lax'});
}

function setCookie(name, value, options = {}) {
    options = {
        path: '/',
        ...options
    };

    if (options.expires instanceof Date) {
        options.expires = options.expires.toUTCString();
    }

    let updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);

    for (let optionKey in options) {
        updatedCookie += "; " + optionKey;
        let optionValue = options[optionKey];
        if (optionValue !== true) {
            updatedCookie += "=" + optionValue;
        }
    }

    document.cookie = updatedCookie;
}

function getCookie(name) {
    let matches = document.cookie.match(new RegExp(
        "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
}

export function checkStoreAndCoockie() {
    if (get(user) === "") {
        let coockie_token = getCookie('access_token');
        if (coockie_token) {
            user.set(coockie_token)
        } else {
            return false;
        }
    }
    return true;
}

export async function authorizedRequest(apiPart, method, object) {
    if (!checkStoreAndCoockie()) {
        return [null, "Unauthorized"]
    }
    let json_response = await fetch(apiUrl + apiPart, {
        method: method,
        headers: new Headers({
            'Accept': 'application/json',
            'Authorization': 'Bearer ' + get(user),
        }),
        body: JSON.stringify(object)
    }).then(res => res.json());
    if (json_response.detail && json_response.detail === "Not authenticated") {
        return [null, "Unauthorized"]
    } else if (json_response.detail) {
        return [null, json_response.detail]
    }
    return [json_response, null]
}