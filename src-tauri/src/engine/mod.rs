pub mod markdown;
pub mod image_proc;
pub mod rules;

// C-FFI zu zen_engine.cpp
// Alle unsafe Aufrufe sind in den jeweiligen Modulen gekapselt
use std::ffi::CStr;

extern "C" {
    pub fn zen_engine_version() -> *const std::os::raw::c_char;
}

pub fn engine_version() -> String {
    unsafe {
        CStr::from_ptr(zen_engine_version())
            .to_string_lossy()
            .into_owned()
    }
}
