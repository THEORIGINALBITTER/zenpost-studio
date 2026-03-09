fn main() {
    // C++ Engine kompilieren
    cc::Build::new()
        .cpp(true)
        .file("cpp/zen_engine.cpp")
        .flag_if_supported("-std=c++17")
        .flag_if_supported("-O2")
        .compile("zen_engine");

    // Neu kompilieren wenn C++ Dateien sich ändern
    println!("cargo:rerun-if-changed=cpp/zen_engine.cpp");
    println!("cargo:rerun-if-changed=cpp/zen_engine.h");

    tauri_build::build()
}
