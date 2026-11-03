package com.goodfly777.website.common;

import java.util.List;

public record ListResponse<T>(List<T> items) {
}
