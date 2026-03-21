fn main() {
    // C++ Engine V1 kompilieren
    cc::Build::new()
        .cpp(true)
        .file("cpp/zen_engine.cpp")
        .std("c++17")                  // cross-platform: -std=c++17 (GCC/Clang) / /std:c++17 (MSVC)
        .flag_if_supported("-O3")
        .flag_if_supported("-pthread")
        .flag_if_supported("/utf-8")   // MSVC: UTF-8 source+exec charset (fixes C4566 for \uXXXX in strings)
        .flag_if_supported("/wd4996")  // MSVC: suppress strdup() deprecation warning (C4996)
        .compile("zen_engine");

    println!("cargo:rerun-if-changed=cpp/zen_engine.cpp");
    println!("cargo:rerun-if-changed=cpp/zen_engine.h");

    // C++ Engine V2 kompilieren
    cc::Build::new()
        .cpp(true)
        .include("cpp/zen_engine_v2")
        .file("cpp/zen_engine_v2/rule_loader.cpp")
        .file("cpp/zen_engine_v2/rule_index.cpp")
        .file("cpp/zen_engine_v2/analyzer.cpp")
        .file("cpp/zen_engine_v2/autocorrect.cpp")
        .file("cpp/zen_engine_v2/output.cpp")
        .file("cpp/zen_engine_v2/parallel.cpp")
        .file("cpp/zen_engine_v2/zen_engine_v2.cpp")
        .file("cpp/zen_engine_v2/zen_engine_v2_c.cpp")
        .std("c++17")
        .flag_if_supported("-O3")
        .flag_if_supported("-pthread")
        .flag_if_supported("/utf-8")
        .flag_if_supported("/wd4996")
        .compile("zen_engine_v2");

    println!("cargo:rerun-if-changed=cpp/zen_engine_v2/types.h");
    println!("cargo:rerun-if-changed=cpp/zen_engine_v2/rule_loader.h");
    println!("cargo:rerun-if-changed=cpp/zen_engine_v2/rule_loader.cpp");
    println!("cargo:rerun-if-changed=cpp/zen_engine_v2/rule_index.h");
    println!("cargo:rerun-if-changed=cpp/zen_engine_v2/rule_index.cpp");
    println!("cargo:rerun-if-changed=cpp/zen_engine_v2/analyzer.h");
    println!("cargo:rerun-if-changed=cpp/zen_engine_v2/analyzer.cpp");
    println!("cargo:rerun-if-changed=cpp/zen_engine_v2/autocorrect.h");
    println!("cargo:rerun-if-changed=cpp/zen_engine_v2/autocorrect.cpp");
    println!("cargo:rerun-if-changed=cpp/zen_engine_v2/output.h");
    println!("cargo:rerun-if-changed=cpp/zen_engine_v2/output.cpp");
    println!("cargo:rerun-if-changed=cpp/zen_engine_v2/parallel.h");
    println!("cargo:rerun-if-changed=cpp/zen_engine_v2/parallel.cpp");
    println!("cargo:rerun-if-changed=cpp/zen_engine_v2/zen_engine_v2.h");
    println!("cargo:rerun-if-changed=cpp/zen_engine_v2/zen_engine_v2.cpp");
    println!("cargo:rerun-if-changed=cpp/zen_engine_v2/zen_engine_v2_c.h");
    println!("cargo:rerun-if-changed=cpp/zen_engine_v2/zen_engine_v2_c.cpp");

    tauri_build::build()
}
