use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use argon2::password_hash::{SaltString, rand_core::OsRng};
use tauri_plugin_fs::FsExt;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn hash_password(password: String) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn verify_password(password: String, hash: String) -> Result<bool, String> {
    let parsed_hash = PasswordHash::new(&hash).map_err(|e| e.to_string())?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}

// BARU: memperluas fs scope secara dinamis untuk folder yang dipilih bebas oleh user.
// storage_root ArchIzin bisa di mana saja di disk (C:\, D:\, dst), jadi tidak bisa
// didaftarkan statis di capabilities/default.json — baru diketahui saat runtime.
// Scope dinamis ini TIDAK persisten antar restart aplikasi, jadi harus dipanggil
// ulang tiap kali app dibuka (lihat App.tsx) dan tiap kali storage_root baru diset
// (lihat SetupStoragePage.tsx).
#[tauri::command]
fn grant_storage_scope(app_handle: tauri::AppHandle, folder_path: String) -> Result<(), String> {
    app_handle
        .fs_scope()
        .allow_directory(&folder_path, true)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn grant_file_scope(app_handle: tauri::AppHandle, file_path: String) -> Result<(), String> {
    app_handle
        .fs_scope()
        .allow_file(&file_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn open_in_default_app(app_handle: tauri::AppHandle, path: String) -> Result<(), String> {
    app_handle
        .opener()
        .open_path(&path, None::<&str>)
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            hash_password,
            verify_password,
            grant_storage_scope,
            grant_file_scope,
            open_in_default_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}